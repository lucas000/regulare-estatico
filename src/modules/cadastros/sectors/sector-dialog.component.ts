import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription, Observable, debounceTime, distinctUntilChanged, switchMap, of, from, map, catchError, finalize } from 'rxjs';
import { CompaniesService } from '../services/companies.service';
import { CompanyEquipmentsService } from '../services/company-equipments.service';
import { CompanyEquipment } from '../models/company-equipment.model';
import { UnitsRepository } from '../repositories/units.repository';
import { SessionService } from '../../../core/services/session.service';
import { AuditHistoryDialogComponent, AuditHistoryData } from '../../../core/components/audit-history-dialog.component';

function toUpperSafe(v: any): string {
  return String(v ?? '').trim().toUpperCase();
}

@Component({
  selector: 'app-sector-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDialogModule,
    MatProgressBarModule,
    MatIconModule,
    MatTooltipModule,
    MatTabsModule,
    MatTableModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatSnackBarModule,
  ],
  templateUrl: './sector-dialog.component.html',
  styleUrls: ['./sector-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectorDialogComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  companies: any[] = [];
  units: any[] = [];
  companyEquipments: CompanyEquipment[] = [];
  sectorEquipments: CompanyEquipment[] = [];
  loadingEquipments = false;
  equipmentCtrl = new FormControl('');
  equipments$!: Observable<CompanyEquipment[]>;
  submitted = false;

  companiesLoading = false;
  unitsLoading = false;
  loadError: string | null = null;
  isEdit = false;
  private subs = new Subscription();
  private readonly cd = inject(ChangeDetectorRef);
  private readonly data = inject(MAT_DIALOG_DATA, { optional: true });
  private readonly companiesService = inject(CompaniesService);
  private readonly companyEquipmentsService = inject(CompanyEquipmentsService);
  private readonly snack = inject(MatSnackBar);
  private readonly unitsRepo = inject(UnitsRepository);
  private readonly session = inject(SessionService);
  private readonly auditDialog = inject(MatDialog);
  isCliente: boolean = this.session.hasRole(['CLIENTE'] as any);

  statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  constructor(private dialogRef: MatDialogRef<any>, private fb: FormBuilder) {
    this.form = this.fb.group({
      companyId: ['', [Validators.required]],
      unitId: ['', [Validators.required]],
      name: ['', [Validators.required]],
      workEnvironmentDescription: ['', [Validators.required]],
      estimatedWorkers: [0, [Validators.required, Validators.min(1)]],
      status: ['active', [Validators.required]],
      notes: [''],
      equipmentIds: [[]],
    });
    if (this.data) {
      this.form.patchValue(this.data as any);
      this.isEdit = !!(this.data as any).id;
    }

    // CLIENTE: fixa empresa padrão (do usuário) e desabilita edição
    if (this.isCliente) {
      const u = (this.session as any).user?.();
      const companyId = u?.companyId ?? '';
      if (companyId) {
        this.form.patchValue({ companyId }, { emitEvent: true });
      }
      this.form.get('companyId')?.disable({ emitEvent: false });
    }
  }

  ngOnInit(): void {
    this.companiesLoading = true;
    this.loadError = null;

    // EPCs Autocomplete
    this.equipments$ = this.equipmentCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term: any) => {
        const companyId = this.form.get('companyId')?.value;
        if (!companyId) return of([]);
        const t = typeof term === 'string' ? term.trim() : '';
        this.loadingEquipments = true;
        this.cd.markForCheck();

        return from(this.companyEquipmentsService.listByCompany(companyId)).pipe(
          map(list => {
            // Filtrar apenas EPCs e pelo termo de busca
            return list.filter(e => 
              e.type === 'EPC' && 
              (e.name || '').toUpperCase().includes(t.toUpperCase())
            );
          }),
          catchError(() => of([])),
          finalize(() => {
            this.loadingEquipments = false;
            this.cd.markForCheck();
          })
        );
      })
    ) as any;

    this.companiesService
      .listCompanies()
      .then((companies) => {
        this.companies = companies;

        const companyId = this.form.get('companyId')?.value;
        const unitId = this.form.get('unitId')?.value;

        // Se estiver em edição, pré-carrega unidades e depois restabelece unitId
        if (companyId) {
          this.loadSectorEquipments(companyId);
          return this.loadUnits(companyId).then(() => {
            if (unitId) {
              this.form.get('unitId')?.setValue(unitId, { emitEvent: false });
            }
          });
        }

        return undefined;
      })
      .catch((e) => {
        console.error('Erro ao carregar empresas', e);
        this.loadError = 'Não foi possível carregar empresas. Tente novamente.';
      })
      .finally(() => {
        this.companiesLoading = false;
        this.cd.markForCheck();
      });

    this.subs.add(
      (this.form.get('companyId') as FormControl).valueChanges.subscribe((companyId) => {
        // ao trocar empresa, limpa unidade e recarrega lista
        this.form.get('unitId')?.setValue('');
        this.units = [];
        this.sectorEquipments = [];
        this.form.get('equipmentIds')?.setValue([]);
        this.loadError = null;
        if (companyId) {
          this.loadUnits(companyId);
          this.loadSectorEquipments(companyId);
        }
        this.cd.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private loadUnits(companyId: string): Promise<void> {
    this.unitsLoading = true;
    this.cd.markForCheck();

    return this.unitsRepo
      .listBy('companyId', companyId, 1000)
      .then((units) => {
        this.units = units;
      })
      .catch((e) => {
        console.error('Erro ao carregar unidades', e);
        this.loadError = 'Não foi possível carregar unidades. Tente novamente.';
      })
      .finally(() => {
        this.unitsLoading = false;
        this.cd.markForCheck();
      });
  }

  private async loadSectorEquipments(companyId: string) {
    if (!companyId) return;
    try {
      const allCompanyEquips = await this.companyEquipmentsService.listByCompany(companyId);
      const equipmentIds = this.form.get('equipmentIds')?.value || [];
      this.sectorEquipments = allCompanyEquips.filter(e => equipmentIds.includes(e.id));
      this.cd.markForCheck();
    } catch (e) {
      console.error('Erro ao carregar equipamentos do setor', e);
    }
  }

  onEquipmentSelected(equip: CompanyEquipment) {
    const currentIds = this.form.get('equipmentIds')?.value || [];
    if (currentIds.includes(equip.id)) {
      this.snack.open('Este EPC já está vinculado ao setor.', 'OK', { duration: 3000 });
      this.equipmentCtrl.setValue('');
      return;
    }

    const newIds = [...currentIds, equip.id];
    this.form.get('equipmentIds')?.setValue(newIds);
    this.sectorEquipments = [...this.sectorEquipments, equip];
    this.equipmentCtrl.setValue('');
    this.cd.markForCheck();
  }

  removeEquipment(equip: CompanyEquipment) {
    const currentIds = this.form.get('equipmentIds')?.value || [];
    const newIds = currentIds.filter((id: string) => id !== equip.id);
    this.form.get('equipmentIds')?.setValue(newIds);
    this.sectorEquipments = this.sectorEquipments.filter(e => e.id !== equip.id);
    this.cd.markForCheck();
  }

  save() {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue() as any;
    this.dialogRef.close({
      ...raw,
      name: toUpperSafe(raw.name),
    });
  }

  cancel() {
    this.dialogRef.close();
  }

  openAuditHistory(): void {
    const auditData: AuditHistoryData = {
      title: 'Setor',
      createdAt: this.data?.createdAt,
      createdBy: this.data?.createdBy,
      updatedAt: this.data?.updatedAt,
      updatedBy: this.data?.updatedBy,
    };

    this.auditDialog.open(AuditHistoryDialogComponent, {
      data: auditData,
      width: '400px',
      disableClose: false,
    });
  }
}
