import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuditHistoryDialogComponent, AuditHistoryData } from '../../../core/components/audit-history-dialog.component';

function toUpperSafe(v: any): string {
  return String(v ?? '').trim().toUpperCase();
}

@Component({
  selector: 'app-equipment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>EPI / EPC</h2>
      <button 
        *ngIf="isEdit && !isDeliveryContext" 
        mat-icon-button 
        class="audit-btn"
        matTooltip="Histórico de alterações"
        (click)="openAuditHistory()">
        <mat-icon>history</mat-icon>
      </button>
    </div>

    <mat-dialog-content [formGroup]="form" class="equipment-dialog">
      <mat-form-field appearance="fill" class="full">
        <mat-label>Nome do Equipamento</mat-label>
        <input matInput formControlName="name" (blur)="normalizeName()" />
        <mat-error *ngIf="(submitted || form.get('name')?.touched) && form.get('name')?.invalid">Obrigatório</mat-error>
      </mat-form-field>

      <div class="grid">
        <mat-form-field appearance="fill">
          <mat-label>Tipo</mat-label>
          <mat-select formControlName="type">
            <mat-option value="EPI">EPI</mat-option>
            <mat-option value="EPC">EPC</mat-option>
          </mat-select>
          <mat-error *ngIf="(submitted || form.get('type')?.touched) && form.get('type')?.invalid">Obrigatório</mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Fabricante</mat-label>
          <input matInput formControlName="manufacturer" />
        </mat-form-field>
      </div>

      <div class="grid">
        <mat-form-field appearance="fill">
          <mat-label>Possui CA / Norma Técnica</mat-label>
          <mat-select formControlName="hasCertification">
            <mat-option [value]="true">Sim</mat-option>
            <mat-option [value]="false">Não</mat-option>
          </mat-select>
          <mat-error *ngIf="(submitted || form.get('hasCertification')?.touched) && form.get('hasCertification')?.invalid">Obrigatório</mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Número do CA / Norma</mat-label>
          <input matInput formControlName="certificationNumber" [disabled]="form.get('hasCertification')?.value === false" />
          <mat-error *ngIf="(submitted || form.get('certificationNumber')?.touched) && form.get('certificationNumber')?.invalid">Obrigatório</mat-error>
        </mat-form-field>
      </div>

      <!-- Campos específicos para EPI -->
      <ng-container *ngIf="form.get('type')?.value === 'EPI'">
        <div class="grid">
          <mat-form-field appearance="fill">
            <mat-label>Validade do EPI</mat-label>
            <input
              matInput
              formControlName="epiExpirationDate"
              placeholder="dd/MM/aaaa"
              inputmode="numeric"
              autocomplete="off"
              maxlength="10"
              (input)="onEpiExpirationDateInput($event)"
            />
            <mat-error *ngIf="(submitted || form.get('epiExpirationDate')?.touched) && form.get('epiExpirationDate')?.hasError('pattern')">Data inválida (use dd/MM/aaaa)</mat-error>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Tamanho do EPI</mat-label>
            <mat-select formControlName="epiSize">
              <mat-option value="">Não aplicável</mat-option>
              <mat-option value="PP">PP</mat-option>
              <mat-option value="P">P</mat-option>
              <mat-option value="M">M</mat-option>
              <mat-option value="G">G</mat-option>
              <mat-option value="GG">GG</mat-option>
              <mat-option value="XG">XG</mat-option>
              <mat-option value="Único">Tamanho Único</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </ng-container>

      <!-- Campos específicos para EPC -->
      <ng-container *ngIf="form.get('type')?.value === 'EPC'">
        <div class="grid">
          <mat-form-field appearance="fill">
            <mat-label>Nº do Laudo</mat-label>
            <input matInput formControlName="reportNumber" />
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Nº do Certificado de Manutenção</mat-label>
            <input matInput formControlName="maintenanceCertificateNumber" />
          </mat-form-field>
        </div>
      </ng-container>

      <div class="grid">
        <mat-form-field appearance="fill">
          <mat-label>Validade CA</mat-label>
          <input
            matInput
            formControlName="validUntil"
            placeholder="dd/MM/aaaa"
            inputmode="numeric"
            autocomplete="off"
            maxlength="10"
            [disabled]="form.get('hasCertification')?.value === false"
            (input)="onValidUntilInput($event)"
          />
          <mat-error *ngIf="(submitted || form.get('validUntil')?.touched) && form.get('validUntil')?.hasError('pattern')">Data inválida (use dd/MM/aaaa)</mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Situação</mat-label>
          <mat-select formControlName="status">
            <mat-option value="ativo">Ativo</mat-option>
            <mat-option value="inativo">Inativo</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <mat-form-field appearance="fill" class="full">
        <mat-label>Observações</mat-label>
        <textarea matInput rows="3" formControlName="notes"></textarea>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="save()">Salvar</button>
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

    .equipment-dialog { display: block; }
    .full { width: 100%; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<EquipmentDialogComponent>);
  private readonly data = inject(MAT_DIALOG_DATA, { optional: true }) as any;
  private readonly fb = inject(FormBuilder);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly auditDialog = inject(MatDialog);
  isDeliveryContext = false;

  submitted = false;
  isEdit = false;

  form = this.fb.group({
    name: ['', [Validators.required]],
    type: ['EPI', [Validators.required]],
    manufacturer: [''],
    hasCertification: [true as any, [Validators.required]],
    certificationNumber: ['', []],
    validUntil: ['', [Validators.pattern(/^\d{2}\/\d{2}\/\d{4}$/)]],
    // Campos EPI
    epiExpirationDate: ['', [Validators.pattern(/^\d{2}\/\d{2}\/\d{4}$/)]],
    epiSize: [''],
    // Campos EPC
    reportNumber: [''],
    maintenanceCertificateNumber: [''],
    notes: [''],
    status: ['ativo', [Validators.required]],
  });

  constructor() {
    if (this.data) {
      this.isDeliveryContext = !!this.data._deliveryContext;
      const patch: any = { ...this.data };
      // validUntil já é string dd/MM/aaaa - não converter
      this.form.patchValue(patch);
      this.form.patchValue({ name: toUpperSafe(patch?.name) }, { emitEvent: false });
      this.isEdit = !!this.data.id;
    }

    this.form.get('hasCertification')?.valueChanges.subscribe((v) => {
      const has = !!v;
      const certCtrl = this.form.get('certificationNumber');
      const validCtrl = this.form.get('validUntil');

      if (!has) {
        certCtrl?.setValue('', { emitEvent: false });
        validCtrl?.setValue('', { emitEvent: false });
        certCtrl?.clearValidators();
      } else {
        certCtrl?.setValidators([Validators.required]);
      }
      certCtrl?.updateValueAndValidity({ emitEvent: false });
      this.cd.markForCheck();
    });

    // trigger validators on init
    const initialHas = this.form.get('hasCertification')?.value;
    this.form.get('hasCertification')?.setValue(initialHas, { emitEvent: true });
  }

  normalizeName() {
    const current = this.form.get('name')?.value;
    const upper = toUpperSafe(current);
    if (upper !== current) {
      this.form.patchValue({ name: upper }, { emitEvent: false });
      this.cd.markForCheck();
    }
  }

  onValidUntilInput(evt: Event) {
    const el = evt.target as HTMLInputElement;
    const raw = (el?.value ?? '').toString();

    // mantém apenas dígitos e aplica máscara dd/MM/aaaa
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let masked = '';
    if (digits.length <= 2) masked = digits;
    else if (digits.length <= 4) masked = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    else masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;

    if (masked !== this.form.get('validUntil')?.value) {
      this.form.get('validUntil')?.setValue(masked, { emitEvent: false });
    }
  }

  onEpiExpirationDateInput(evt: Event) {
    const el = evt.target as HTMLInputElement;
    const raw = (el?.value ?? '').toString();

    // mantém apenas dígitos e aplica máscara dd/MM/aaaa
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let masked = '';
    if (digits.length <= 2) masked = digits;
    else if (digits.length <= 4) masked = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    else masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;

    if (masked !== this.form.get('epiExpirationDate')?.value) {
      this.form.get('epiExpirationDate')?.setValue(masked, { emitEvent: false });
    }
  }

  save() {
    this.submitted = true;
    this.normalizeName();

    // enforce conditional requirement
    const has = !!this.form.get('hasCertification')?.value;
    if (has) {
      this.form.get('certificationNumber')?.setValidators([Validators.required]);
      this.form.get('certificationNumber')?.updateValueAndValidity({ emitEvent: false });
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cd.markForCheck();
      return;
    }

    const raw: any = this.form.getRawValue();
    this.dialogRef.close({
      ...raw,
      validUntil: has ? String(raw.validUntil ?? '').trim() : '',
      certificationNumber: has ? String(raw.certificationNumber ?? '').trim() : '',
    });
  }

  cancel() {
    this.dialogRef.close(null);
  }

  openAuditHistory(): void {
    const auditData: AuditHistoryData = {
      title: 'EPI / EPC',
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
