import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { Subscription } from 'rxjs';

import { LicensesService } from '../services/licenses.service';
import { LicenseConditionsService } from '../services/license-conditions.service';
import { LicenseCondition, LICENSE_TYPES, LICENSE_GROUPS, LicenseGroup, PERIODICITY_OPTIONS, LicensePeriodicity } from '../models/license.model';
import { Company } from '../../cadastros/models/company.model';
import { Unit } from '../../cadastros/models/unit.model';
import { UnitsRepository } from '../../cadastros/repositories/units.repository';
import { ConditionDialogComponent } from './condition-dialog.component';
import { StorageService } from '../../../core/services/storage.service';
import { AuditHistoryDialogComponent, AuditHistoryData } from '../../../core/components/audit-history-dialog.component';

// Diretiva de máscara de data
function applyDateMask(value: string): string {
  const nums = value.replace(/\D/g, '').slice(0, 8);
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
}

@Component({
  selector: 'app-license-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDialogModule,
    MatIconModule,
    MatTableModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatDividerModule,
  ],
  templateUrl: './license-dialog.component.html',
  styleUrls: ['./license-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LicenseDialogComponent implements OnInit, OnDestroy {
  submitted = false;
  isEdit = false;
  readOnly = false;
  form!: FormGroup;

  private readonly dialogRef = inject(MatDialogRef<LicenseDialogComponent>);
  private readonly data = inject(MAT_DIALOG_DATA, { optional: true });
  private readonly fb = inject(FormBuilder);
  private readonly licensesService = inject(LicensesService);
  private readonly conditionsService = inject(LicenseConditionsService);
  private readonly unitsRepo = inject(UnitsRepository);
  private readonly snack = inject(MatSnackBar);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly dialog = inject(MatDialog);
  private readonly storage = inject(StorageService);

  // Estado para PDF da licença
  selectedPdfFile: File | null = null;
  selectedPdfName: string = '';
  currentPdfUrl: string = '';
  currentPdfName: string = '';
  currentPdfContentType: string = '';

  companies: Company[] = [];
  units: Unit[] = [];
  unitsLoading = false;
  licenseTypes = LICENSE_TYPES;
  licenseGroups: LicenseGroup[] = LICENSE_GROUPS;
  filteredLicenseTypes: string[] = [];
  periodicityOptions = PERIODICITY_OPTIONS;

  // Condicionantes
  conditions: LicenseCondition[] = [];
  conditionsDataSource = new MatTableDataSource<LicenseCondition>([]);
  conditionColumns = ['description', 'dueDate', 'status', 'evidence', 'acoes'];
  conditionsLoading = false;

  saving = false;

  private subs = new Subscription();

  ngOnInit(): void {
    this.initForm();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // Verifica se o grupo selecionado é "Programas de SST"
  get isSSTProgram(): boolean {
    return this.form?.get('documentGroup')?.value === 'Programas de SST';
  }

  private initForm(): void {
    this.form = this.fb.group({
      companyId: ['', Validators.required],
      unitId: ['', Validators.required],
      documentGroup: ['', Validators.required],
      documentType: ['', Validators.required],
      documentNumber: ['', Validators.required],
      issuingAgency: ['', Validators.required],
      legalBasis: ['', [Validators.required, Validators.maxLength(150)]],
      periodicity: [''],
      issueDate: ['', [Validators.required, Validators.pattern(/^\d{2}\/\d{2}\/\d{4}$/)]],
      expirationDate: ['', [Validators.required, Validators.pattern(/^\d{2}\/\d{2}\/\d{4}$/)]],
      pdfUrl: [''],
      notes: [''],
      // Campos do Responsável Técnico (obrigatórios para Programas de SST)
      technicalResponsibleName: [''],
      technicalResponsibleCpf: [''],
      technicalResponsibleCouncil: [''],
      technicalResponsibleRegistration: [''],
      technicalResponsibleArt: [''],
    });

    // Listener para atualizar tipos de documento quando o grupo muda
    this.subs.add(
      this.form.get('documentGroup')?.valueChanges.subscribe((group: string) => {
        const found = this.licenseGroups.find(g => g.group === group);
        this.filteredLicenseTypes = found ? found.items : [];
        // Limpa o tipo selecionado se não pertence ao novo grupo
        const currentType = this.form.get('documentType')?.value;
        if (currentType && !this.filteredLicenseTypes.includes(currentType)) {
          this.form.get('documentType')?.reset();
        }

        // Atualiza validações dos campos de Responsável Técnico
        this.updateTechnicalResponsibleValidators(group === 'Programas de SST');

        this.cd.markForCheck();
      }) as Subscription
    );

    if (this.data) {
      this.isEdit = !!this.data.isEdit;
      this.readOnly = !!this.data.readOnly;
      this.companies = this.data.companies || [];

      if (this.isEdit) {
        // Se temos documentGroup salvo, carregar os tipos primeiro
        if (this.data.documentGroup) {
          const found = this.licenseGroups.find(g => g.group === this.data.documentGroup);
          this.filteredLicenseTypes = found ? found.items : [];

          // Se é SST, ativa as validações dos campos de Responsável Técnico
          if (this.data.documentGroup === 'Programas de SST') {
            this.updateTechnicalResponsibleValidators(true);
          }
        }

        this.form.patchValue({
          companyId: this.data.companyId,
          unitId: this.data.unitId,
          documentGroup: this.data.documentGroup || '',
          documentType: this.data.documentType,
          documentNumber: this.data.documentNumber,
          issuingAgency: this.data.issuingAgency,
          legalBasis: this.data.legalBasis || '',
          periodicity: this.data.periodicity || '',
          issueDate: this.data.issueDate,
          expirationDate: this.data.expirationDate,
          pdfUrl: this.data.pdfUrl,
          notes: this.data.notes,
          // Campos do Responsável Técnico
          technicalResponsibleName: this.data.technicalResponsibleName || '',
          technicalResponsibleCpf: this.data.technicalResponsibleCpf || '',
          technicalResponsibleCouncil: this.data.technicalResponsibleCouncil || '',
          technicalResponsibleRegistration: this.data.technicalResponsibleRegistration || '',
          technicalResponsibleArt: this.data.technicalResponsibleArt || '',
        });
        this.currentPdfUrl = this.data.pdfUrl || '';
        this.currentPdfName = this.data.pdfName || '';
        this.currentPdfContentType = this.data.pdfContentType || '';

        // Carregar condicionantes
        this.loadConditions(this.data.id);
      } else if (this.data.companyId) {
        this.form.get('companyId')?.setValue(this.data.companyId);
      }

      if (this.readOnly) {
        this.form.disable();
      }
    }
  }

  private async loadInitialData(): Promise<void> {
    const companyId = this.form.get('companyId')?.value;
    if (companyId) {
      await this.loadUnits(companyId);
    }
  }

  async onCompanyChange(): Promise<void> {
    const companyId = this.form.get('companyId')?.value;
    this.form.get('unitId')?.setValue('');
    this.units = [];

    if (companyId) {
      await this.loadUnits(companyId);
    }
    this.cd.markForCheck();
  }

  private async loadUnits(companyId: string): Promise<void> {
    this.unitsLoading = true;
    this.cd.markForCheck();

    try {
      this.units = await this.unitsRepo.listByCompany(companyId);
    } catch (e) {
      console.error('Erro ao carregar unidades', e);
    } finally {
      this.unitsLoading = false;
      this.cd.markForCheck();
    }
  }

  private async loadConditions(licenseId: string): Promise<void> {
    this.conditionsLoading = true;
    this.cd.markForCheck();

    try {
      this.conditions = await this.conditionsService.listByLicense(licenseId);
      this.conditionsDataSource.data = this.conditions;
    } catch (e) {
      console.error('Erro ao carregar condicionantes', e);
    } finally {
      this.conditionsLoading = false;
      this.cd.markForCheck();
    }
  }

  // Máscara de data
  onDateInput(event: Event, controlName: string): void {
    const input = event.target as HTMLInputElement;
    const masked = applyDateMask(input.value);
    input.value = masked;
    this.form.get(controlName)?.setValue(masked, { emitEvent: false });
  }

  // Máscara de CPF para Responsável Técnico
  onTechnicalCpfInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = (input?.value ?? '').toString();
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    let masked = digits;

    if (digits.length > 3) masked = `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length > 6) masked = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    if (digits.length > 9) masked = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;

    input.value = masked;
    this.form.get('technicalResponsibleCpf')?.setValue(masked, { emitEvent: false });
  }

  // Atualiza validadores dos campos de Responsável Técnico
  private updateTechnicalResponsibleValidators(isRequired: boolean): void {
    const fields = [
      'technicalResponsibleName',
      'technicalResponsibleCpf',
      'technicalResponsibleCouncil',
      'technicalResponsibleRegistration',
      'technicalResponsibleArt'
    ];

    fields.forEach(field => {
      const control = this.form.get(field);
      if (control) {
        if (isRequired) {
          control.setValidators([Validators.required]);
        } else {
          control.clearValidators();
          control.setValue(''); // Limpa o valor quando não é SST
        }
        control.updateValueAndValidity();
      }
    });
  }

  onPdfSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) {
      this.selectedPdfFile = null;
      this.selectedPdfName = '';
      return;
    }
    const file = files[0];
    this.selectedPdfFile = file;
    this.selectedPdfName = file.name;
  }

  // Validações
  isDateValid(dateStr: string): boolean {
    if (!dateStr || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return false;
    const [d, m, y] = dateStr.split('/').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getDate() === d && date.getMonth() === m - 1 && date.getFullYear() === y;
  }

  validateDates(): string | null {
    const issue = this.form.get('issueDate')?.value;
    const expiration = this.form.get('expirationDate')?.value;

    if (!this.isDateValid(issue)) return 'Data de emissão inválida';
    if (!this.isDateValid(expiration)) return 'Data de vencimento inválida';

    const [dI, mI, yI] = issue.split('/').map(Number);
    const [dE, mE, yE] = expiration.split('/').map(Number);
    const issueDate = new Date(yI, mI - 1, dI);
    const expirationDate = new Date(yE, mE - 1, dE);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (issueDate > today) return 'Data de emissão não pode ser futura';
    if (expirationDate < issueDate) return 'Vencimento deve ser maior ou igual à emissão';

    return null;
  }

  async save(): Promise<void> {
    this.submitted = true;
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.snack.open('Preencha todos os campos obrigatórios', 'OK', { duration: 3000 });
      return;
    }

    const dateError = this.validateDates();
    if (dateError) {
      this.snack.open(dateError, 'OK', { duration: 3000 });
      return;
    }

    this.saving = true;
    this.cd.markForCheck();

    try {
      const formData = this.form.getRawValue();

      if (this.isEdit && this.data?.id) {
        // Update license first
        await this.licensesService.updateLicense(this.data.id, formData);
        // If a new PDF was selected, upload and update fields
        if (this.selectedPdfFile) {
          const companyId = this.form.get('companyId')?.value;
          const licenseId = this.data.id as string;
          const path = `licenses/${companyId}/${licenseId}/pdf`;
          const contentType = this.selectedPdfFile.type || 'application/pdf';
          const url = await this.storage.upload(path, await this.selectedPdfFile.arrayBuffer(), contentType);
          await this.licensesService.updateLicense(licenseId, {
            pdfUrl: url,
            pdfName: this.selectedPdfFile.name,
            pdfContentType: contentType,
          });
        }
      } else {
        // Create license, then upload PDF if provided
        const created = await this.licensesService.createLicense(formData);
        const licenseId = created.id;
        const companyId = this.form.get('companyId')?.value;
        if (this.selectedPdfFile) {
          const path = `licenses/${companyId}/${licenseId}/pdf`;
          const contentType = this.selectedPdfFile.type || 'application/pdf';
          const url = await this.storage.upload(path, await this.selectedPdfFile.arrayBuffer(), contentType);
          await this.licensesService.updateLicense(licenseId, {
            pdfUrl: url,
            pdfName: this.selectedPdfFile.name,
            pdfContentType: contentType,
          });
        }
      }

      this.dialogRef.close(true);
    } catch (e) {
      console.error('Erro ao salvar licença', e);
      this.snack.open('Erro ao salvar licença', 'OK', { duration: 3000 });
    } finally {
      this.saving = false;
      this.cd.markForCheck();
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  // Condicionantes
  newCondition(): void {
    if (!this.data?.id) return;

    const dialogRef = this.dialog.open(ConditionDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: {
        licenseId: this.data.id,
        companyId: this.form.get('companyId')?.value,
      },
      disableClose: true,
      hasBackdrop: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadConditions(this.data.id);
        this.snack.open('Condicionante adicionada com sucesso', 'OK', { duration: 3000 });
      }
    });
  }

  editCondition(cond: LicenseCondition): void {
    const dialogRef = this.dialog.open(ConditionDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      data: { ...cond, isEdit: true },
      disableClose: true,
      hasBackdrop: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadConditions(this.data.id);
        this.snack.open('Condicionante atualizada com sucesso', 'OK', { duration: 3000 });
      }
    });
  }

  async markConditionAsCumprida(cond: LicenseCondition): Promise<void> {
    try {
      await this.conditionsService.markAsCumprida(cond.id);
      await this.loadConditions(this.data.id);
      this.snack.open('Condicionante marcada como cumprida', 'OK', { duration: 3000 });
    } catch (e) {
      console.error('Erro ao atualizar condicionante', e);
      this.snack.open('Erro ao atualizar condicionante', 'OK', { duration: 3000 });
    }
  }

  async deleteCondition(cond: LicenseCondition): Promise<void> {
    if (!confirm('Deseja realmente excluir esta condicionante?')) return;

    try {
      await this.conditionsService.delete(cond.id);
      await this.loadConditions(this.data.id);
      this.snack.open('Condicionante excluída', 'OK', { duration: 3000 });
    } catch (e) {
      console.error('Erro ao excluir condicionante', e);
      this.snack.open('Erro ao excluir condicionante', 'OK', { duration: 3000 });
    }
  }

  getConditionStatusLabel(status: string): string {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'a_vencer': return 'A vencer';
      case 'cumprida': return 'Cumprida';
      case 'vencida': return 'Vencida';
      default: return status;
    }
  }

  getConditionStatusClass(status: string): string {
    return `status-${status}`;
  }

  // Abre modal de histórico de alterações
  openAuditHistory(): void {
    const auditData: AuditHistoryData = {
      title: 'Licença Regulatória',
      createdAt: this.data?.createdAt,
      createdBy: this.data?.createdBy,
      updatedAt: this.data?.updatedAt,
      updatedBy: this.data?.updatedBy,
    };

    this.dialog.open(AuditHistoryDialogComponent, {
      data: auditData,
      width: '400px',
      disableClose: false,
    });
  }
}
