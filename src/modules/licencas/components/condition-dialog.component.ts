import { ChangeDetectionStrategy, Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { LicenseConditionsService } from '../services/license-conditions.service';
import { StorageService } from '../../../core/services/storage.service';
import { AuditHistoryDialogComponent, AuditHistoryData } from '../../../core/components/audit-history-dialog.component';

function applyDateMask(value: string): string {
  const nums = value.replace(/\D/g, '').slice(0, 8);
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
}

@Component({
  selector: 'app-condition-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>{{ isEdit ? 'Editar Condicionante' : 'Nova Condicionante' }}</h2>
      <button 
        *ngIf="isEdit" 
        mat-icon-button 
        class="audit-btn"
        matTooltip="Histórico de alterações"
        (click)="openAuditHistory()">
        <mat-icon>history</mat-icon>
      </button>
    </div>

    <mat-dialog-content>
      <mat-progress-bar *ngIf="saving" mode="indeterminate"></mat-progress-bar>

      <form [formGroup]="form" class="condition-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descrição da Condicionante</mat-label>
          <input matInput formControlName="description"  required/>
          <mat-error *ngIf="form.get('description')?.hasError('required')">Obrigatório</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Prazo (Data Limite)</mat-label>
          <input matInput formControlName="dueDate" placeholder="DD/MM/AAAA" maxlength="10" (input)="onDateInput($event)" required />
          <mat-error *ngIf="form.get('dueDate')?.hasError('required')">Obrigatório</mat-error>
          <mat-error *ngIf="form.get('dueDate')?.hasError('pattern')">Formato: DD/MM/AAAA</mat-error>
        </mat-form-field>

        <!-- Anexo de documento (PDF) - layout padronizado -->
        <div class="full-width upload-group">
          <label>Anexar documento (PDF)</label>
          <div class="upload-actions">
            <input #evidenceInput class="hidden-input" type="file" accept="application/pdf" (change)="onFileSelected($event)" [disabled]="saving" />
            <button mat-stroked-button color="primary" type="button" (click)="evidenceInput.click()" [disabled]="saving">
              <mat-icon>upload_file</mat-icon>
              {{ selectedFileName ? 'Trocar PDF' : (currentEvidenceUrl ? 'Substituir PDF' : 'Enviar PDF') }}
            </button>
            <span class="file-pill" *ngIf="selectedFileName">
              <mat-icon class="pill-icon">insert_drive_file</mat-icon>
              {{ selectedFileName }}
            </span>
            <a *ngIf="currentEvidenceUrl && !selectedFileName" [href]="currentEvidenceUrl" target="_blank" class="link-pill" title="Abrir documento atual">
              <mat-icon class="pill-icon">picture_as_pdf</mat-icon>
              {{ currentEvidenceName || 'Documento atual' }}
            </a>
          </div>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Observação sobre Evidência (opcional)</mat-label>
          <textarea matInput formControlName="evidenceNotes" rows="2"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="saving">
        {{ saving ? 'Salvando...' : 'Salvar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0;
    }
    .dialog-header h2[mat-dialog-title] { margin: 0; flex: 1; }
    .dialog-header .audit-btn {
      color: #757575;
      transition: color 0.2s ease;
    }
    .dialog-header .audit-btn:hover { color: #1565c0; }
    .dialog-header .audit-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .condition-form { padding-top: 16px; }
    .full-width { width: 100%; margin-bottom: 5px}
    mat-dialog-content { min-width: 400px; }
    @media (max-width: 600px) { mat-dialog-content { min-width: auto; } }

    /* Upload UI padronizada (mesma do license-dialog) */
    .upload-group { display: block; }
    .upload-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .hidden-input {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .file-pill,
    .link-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      border-radius: 16px;
      padding: 6px 10px;
      font-size: 12px;
    }
    .file-pill { background: #e3f2fd; color: #0d47a1; }
    .link-pill { background: #f3e5f5; color: #6a1b9a; text-decoration: none; }
    .pill-icon { font-size: 16px; height: 16px; width: 16px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConditionDialogComponent implements OnInit {
  submitted = false;
  isEdit = false;
  form!: FormGroup;
  saving = false;

  // Estado para upload de evidência
  selectedFile: File | null = null;
  selectedFileName: string = '';
  currentEvidenceUrl: string = '';
  currentEvidenceName: string = '';

  private readonly dialogRef = inject(MatDialogRef<ConditionDialogComponent>);
  private readonly data = inject(MAT_DIALOG_DATA, { optional: true });
  private readonly fb = inject(FormBuilder);
  private readonly conditionsService = inject(LicenseConditionsService);
  private readonly snack = inject(MatSnackBar);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly storage = inject(StorageService);
  private readonly auditDialog = inject(MatDialog);

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.form = this.fb.group({
      description: ['', Validators.required],
      dueDate: ['', [Validators.required, Validators.pattern(/^\d{2}\/\d{2}\/\d{4}$/)]],
      evidenceUrl: [''],
      evidenceNotes: [''],
    });

    if (this.data) {
      this.isEdit = !!this.data.isEdit;

      if (this.isEdit) {
        this.form.patchValue({
          description: this.data.description,
          dueDate: this.data.dueDate,
          evidenceUrl: this.data.evidenceUrl,
          evidenceNotes: this.data.evidenceNotes,
        });
        this.currentEvidenceUrl = this.data.evidenceUrl || '';
        this.currentEvidenceName = this.data.evidenceName || '';
      }
    }
  }

  onDateInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const masked = applyDateMask(input.value);
    input.value = masked;
    this.form.get('dueDate')?.setValue(masked, { emitEvent: false });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) {
      this.selectedFile = null;
      this.selectedFileName = '';
      return;
    }
    const file = files[0];
    this.selectedFile = file;
    this.selectedFileName = file.name;
  }

  async save(): Promise<void> {
    this.submitted = true;
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.snack.open('Preencha todos os campos obrigatórios', 'OK', { duration: 3000 });
      return;
    }

    this.saving = true;
    this.cd.markForCheck();

    try {
      const formData = this.form.getRawValue();
      const { evidenceUrl: _ignoreEvidenceUrl, ...payload } = formData as any;

      // Manter URL existente se não houver novo arquivo selecionado
      let conditionId = this.data?.id as string | undefined;
      let evidenceUrlToSet: string | undefined = undefined;

      if (this.isEdit && conditionId) {
        // Atualização
        if (this.selectedFile) {
          const licenseId = this.data.licenseId as string;
          const companyId = this.data.companyId as string;
          const path = `licenses/${companyId}/${licenseId}/conditions/${conditionId}/evidence`;
          const contentType = this.selectedFile.type || undefined;
          const url = await this.storage.upload(path, await this.selectedFile.arrayBuffer(), contentType);
          evidenceUrlToSet = url;
          await this.conditionsService.updateCondition(conditionId, {
            ...payload,
            evidenceUrl: evidenceUrlToSet,
            evidenceName: this.selectedFile.name,
            evidenceContentType: contentType || ''
          });
        } else {
          await this.conditionsService.updateCondition(conditionId, {
            ...payload,
          });
        }
      } else {
        // Criação: primeiro cria para obter o ID, depois faz upload e atualiza
        const created = await this.conditionsService.createCondition({
          ...payload,
          licenseId: this.data.licenseId,
          companyId: this.data.companyId,
        });
        conditionId = created.id;

        if (this.selectedFile && conditionId) {
          const licenseId = this.data.licenseId as string;
          const companyId = this.data.companyId as string;
          const path = `licenses/${companyId}/${licenseId}/conditions/${conditionId}/evidence`;
          const contentType = this.selectedFile.type || undefined;
          const url = await this.storage.upload(path, await this.selectedFile.arrayBuffer(), contentType);
          await this.conditionsService.updateCondition(conditionId, { 
            evidenceUrl: url,
            evidenceName: this.selectedFile.name,
            evidenceContentType: contentType || ''
          });
        }
      }

      this.dialogRef.close(true);
    } catch (e) {
      console.error('Erro ao salvar condicionante', e);
      this.snack.open('Erro ao salvar condicionante', 'OK', { duration: 3000 });
    } finally {
      this.saving = false;
      this.cd.markForCheck();
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  openAuditHistory(): void {
    const auditData: AuditHistoryData = {
      title: 'Condicionante',
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
