import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, FormControl } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription, Observable, of, from } from 'rxjs';
import { CompaniesService } from '../../cadastros/services/companies.service';
import { UnitsRepository } from '../../cadastros/repositories/units.repository';
import { SectorsFiltersRepository } from '../../cadastros/repositories/sectors-filters.repository';
import { EmployeesRepository } from '../../cadastros/repositories/employees.repository';
import { CompanyRisksService } from '../../cadastros/services/company-risks.service';
import { CompanyEquipmentsService } from '../../cadastros/services/company-equipments.service';
import { CompanyCargosService } from '../../cadastros/services/company-cargos.service';
import { SessionService } from '../../../core/services/session.service';
import { EquipmentDialogComponent } from '../../cadastros/equipments/equipment-dialog.component';
import { RiskDialogComponent } from '../../cadastros/risks/risk-dialog.component';

@Component({
  selector: 'app-epi-delivery-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatSelectModule,
    MatIconModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatTableModule,
    MatSnackBarModule,
  ],
  templateUrl: './epi-delivery-dialog.component.html',
  styleUrls: ['./epi-delivery-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EpiDeliveryDialogComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  isEdit = false;
  submitted = false;

  companies: any[] = [];
  units: any[] = [];
  sectors: any[] = [];
  employees: any[] = [];
  
  selectedEmployee: any = null;
  companyRisks: any[] = [];
  suggestedEquipments: any[] = [];
  
  selectedRisksIds: string[] = [];
  deliveryItems: any[] = [];
  
  loading = false;
  companiesLoading = false;
  unitsLoading = false;
  sectorsLoading = false;
  employeesLoading = false;
  loadingInitial = false;

  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<EpiDeliveryDialogComponent>);
  private readonly data = inject(MAT_DIALOG_DATA, { optional: true });
  private readonly companiesService = inject(CompaniesService);
  private readonly unitsRepo = inject(UnitsRepository);
  private readonly sectorsRepo = inject(SectorsFiltersRepository);
  private readonly employeesRepo = inject(EmployeesRepository);
  private readonly companyRisksService = inject(CompanyRisksService);
  private readonly companyEquipmentsService = inject(CompanyEquipmentsService);
  private readonly companyCargosService = inject(CompanyCargosService);
  private readonly session = inject(SessionService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  isCliente = this.session.hasRole(['CLIENTE'] as any);
  displayedColumns: string[] = ['name', 'ca', 'quantity', 'nextExchange', 'actions'];

  constructor() {
    this.form = this.fb.group({
      companyId: ['', [Validators.required]],
      unitId: ['', [Validators.required]],
      sectorId: ['', [Validators.required]],
      employeeId: ['', [Validators.required]],
      deliveryDate: [new Date().toISOString().substring(0, 10), [Validators.required]],
      notes: [''],
    });

    if (this.data) {
      this.isEdit = !!this.data.id;
      this.form.patchValue(this.data, { emitEvent: false });
      if (this.data.items) this.deliveryItems = [...this.data.items];
      if (this.data.riskIds) this.selectedRisksIds = [...this.data.riskIds];
    }
  }

  async ngOnInit() {
    await this.loadCompanies();
    
    // Listeners para carregar dependências
    this.form.get('companyId')?.valueChanges.subscribe(cid => {
      this.loadUnits(cid);
      this.loadCompanyRisks(cid);
      this.loadSuggestedEquipments(cid);
      if (!this.loadingInitial) {
        this.resetDownstream('company');
      }
    });

    this.form.get('unitId')?.valueChanges.subscribe(uid => {
      this.loadSectors(this.form.get('companyId')?.value, uid);
      if (!this.loadingInitial) {
        this.resetDownstream('unit');
      }
    });

    this.form.get('sectorId')?.valueChanges.subscribe(sid => {
      this.loadEmployees(this.form.get('companyId')?.value, this.form.get('unitId')?.value, sid);
      if (!this.loadingInitial) {
        this.resetDownstream('sector');
      }
    });

    this.form.get('employeeId')?.valueChanges.subscribe(eid => {
      this.onEmployeeSelected(eid);
    });

    // Se estiver em edição ou se for CLIENTE, carregar dados iniciais
    const initialCid = this.form.get('companyId')?.value;
    if (initialCid) {
      this.loadingInitial = true;
      try {
        await Promise.all([
          this.loadUnits(initialCid),
          this.loadCompanyRisks(initialCid),
          this.loadSuggestedEquipments(initialCid)
        ]);
        
        const initialUid = this.form.get('unitId')?.value;
        if (initialUid) {
          await this.loadSectors(initialCid, initialUid);
          
          const initialSid = this.form.get('sectorId')?.value;
          if (initialSid) {
            await this.loadEmployees(initialCid, initialUid, initialSid);
            
            const initialEid = this.form.get('employeeId')?.value;
            if (initialEid) {
              await this.onEmployeeSelected(initialEid);
            }
          }
        }
      } finally {
        this.loadingInitial = false;
        this.cd.markForCheck();
      }
    }
  }

  ngOnDestroy() {}

  private async loadCompanies() {
    this.companiesLoading = true;
    this.cd.markForCheck();
    try {
      this.companies = await this.companiesService.listCompanies();
    } finally {
      this.companiesLoading = false;
      this.cd.markForCheck();
    }
  }

  private async loadUnits(companyId: string) {
    if (!companyId) return;
    this.unitsLoading = true;
    this.cd.markForCheck();
    try {
      this.units = await this.unitsRepo.listBy('companyId' as any, companyId, 500);
    } finally {
      this.unitsLoading = false;
      this.cd.markForCheck();
    }
  }

  private async loadSectors(companyId: string, unitId: string) {
    if (!companyId || !unitId) return;
    this.sectorsLoading = true;
    this.cd.markForCheck();
    try {
      this.sectors = await this.sectorsRepo.listByCompanyAndUnit(companyId, unitId, 500);
    } finally {
      this.sectorsLoading = false;
      this.cd.markForCheck();
    }
  }

  private async loadEmployees(companyId: string, unitId: string, sectorId: string) {
    if (!companyId || !unitId || !sectorId) return;
    this.employeesLoading = true;
    this.cd.markForCheck();
    try {
      // Usar o repositório diretamente para filtrar por setor se necessário, 
      // ou filtrar em memória se o serviço não der suporte.
      const all = await this.employeesRepo.listByFilters({ companyId, unitId }, 1000);
      this.employees = all.filter(e => e.sectorId === sectorId);
    } finally {
      this.employeesLoading = false;
      this.cd.markForCheck();
    }
  }

  private async loadCompanyRisks(companyId: string) {
    if (!companyId) return;
    try {
      this.companyRisks = await this.companyRisksService.listByCompany(companyId);
    } catch (e) {
      console.error('Erro ao carregar riscos da empresa', e);
    }
  }

  private async loadSuggestedEquipments(companyId: string) {
    if (!companyId) return;
    try {
      // Listar apenas EPIs da empresa
      const all = await this.companyEquipmentsService.listByCompany(companyId);
      this.suggestedEquipments = all.filter(e => e.type === 'EPI');
    } catch (e) {
      console.error('Erro ao carregar equipamentos da empresa', e);
    }
  }

  async onEmployeeSelected(employeeId: string) {
    this.selectedEmployee = this.employees.find(e => e.id === employeeId);
    if (this.selectedEmployee) {
      // Ao selecionar funcionário, pré-seleciona automaticamente os riscos do cargo dele
      try {
        const cargo = await this.companyCargosService.listByCompany(this.form.get('companyId')?.value)
          .then(list => list.find(c => c.id === this.selectedEmployee.cargoId));
        
        if (cargo && Array.isArray(cargo.riskIds)) {
          // Adiciona os riscos do cargo aos selecionados, evitando duplicatas
          const newRiskIds = [...new Set([...this.selectedRisksIds, ...cargo.riskIds])];
          this.selectedRisksIds = newRiskIds;
        }
      } catch (e) {
        console.error('Erro ao carregar riscos do cargo', e);
      }
    }
    this.cd.markForCheck();
  }

  toggleRisk(riskId: string) {
    const idx = this.selectedRisksIds.indexOf(riskId);
    if (idx > -1) {
      this.selectedRisksIds.splice(idx, 1);
    } else {
      this.selectedRisksIds.push(riskId);
    }
  }

  isRiskSelected(riskId: string): boolean {
    return this.selectedRisksIds.includes(riskId);
  }

  toggleEquipment(equip: any) {
    const existingIdx = this.deliveryItems.findIndex(item => item.equipmentId === equip.id);
    if (existingIdx > -1) {
      this.deliveryItems.splice(existingIdx, 1);
    } else {
      // Clona o equipamento completo e adiciona campos da entrega
      const { id, createdAt, updatedAt, createdBy, updatedBy, ...cleanEquip } = equip;
      this.deliveryItems.push({
        ...cleanEquip,
        equipmentId: equip.id,
        quantity: 1,
        nextExchangeDate: '',
      });
    }
    this.deliveryItems = [...this.deliveryItems]; // Trigger table update
    this.cd.markForCheck();
  }

  isEquipmentSelected(equipId: string): boolean {
    return this.deliveryItems.some(item => item.equipmentId === equipId);
  }

  editItem(item: any) {
    // Abre o diálogo com os dados atuais do item (que já contém todos os campos de Equipment)
    const ref = this.dialog.open(EquipmentDialogComponent, {
      width: '700px',
      data: { ...item, id: item.equipmentId, _deliveryContext: true },
      disableClose: true
    });

    ref.afterClosed().subscribe(res => {
      if (res) {
        // Atualiza todos os campos retornados, preservando os campos específicos da entrega
        const { quantity, nextExchangeDate, equipmentId } = item;
        Object.assign(item, res);
        item.equipmentId = equipmentId; // garante que o ID de referência não mude
        item.quantity = quantity;
        item.nextExchangeDate = nextExchangeDate;
        
        this.deliveryItems = [...this.deliveryItems];
        this.cd.markForCheck();
      }
    });
  }

  removeItem(equipId: string) {
    this.deliveryItems = this.deliveryItems.filter(i => i.equipmentId !== equipId);
    this.cd.markForCheck();
  }

  private resetDownstream(level: 'company' | 'unit' | 'sector') {
    if (level === 'company') {
      this.form.patchValue({ unitId: '', sectorId: '', employeeId: '' }, { emitEvent: false });
      this.units = [];
      this.sectors = [];
      this.employees = [];
      this.selectedEmployee = null;
      this.companyRisks = [];
      this.suggestedEquipments = [];
      this.deliveryItems = [];
      this.selectedRisksIds = [];
    } else if (level === 'unit') {
      this.form.patchValue({ sectorId: '', employeeId: '' }, { emitEvent: false });
      this.sectors = [];
      this.employees = [];
      this.selectedEmployee = null;
    } else if (level === 'sector') {
      this.form.patchValue({ employeeId: '' }, { emitEvent: false });
      this.employees = [];
      this.selectedEmployee = null;
    }
    this.cd.markForCheck();
  }

  save() {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.deliveryItems.length === 0) {
      this.snack.open('Selecione ao menos um EPI para entrega.', 'OK', { duration: 3000 });
      return;
    }

    const val = this.form.getRawValue();
    const payload = {
      ...val,
      employeeName: this.selectedEmployee?.name,
      cargoId: this.selectedEmployee?.cargoId,
      cargoName: this.selectedEmployee?.cargoName,
      cargoCbo: this.selectedEmployee?.cargoCbo,
      riskIds: this.selectedRisksIds,
      items: this.deliveryItems,
    };

    this.dialogRef.close(payload);
  }

  cancel() {
    this.dialogRef.close(null);
  }

  downloadTerm() {
    this.snack.open('Funcionalidade de baixar termo em desenvolvimento.', 'OK', { duration: 2000 });
  }
}
