import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

function toUpperSafe(v: any): string {
  return String(v ?? '').trim().toUpperCase();
}

@Component({
  selector: 'app-risk-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Risco</h2>

    <mat-dialog-content [formGroup]="form" class="risk-dialog">
      <mat-form-field appearance="fill" class="full">
        <mat-label>Nome do Risco</mat-label>
        <input matInput formControlName="name" (blur)="normalizeName()" />
        <mat-error *ngIf="(submitted || form.get('name')?.touched) && form.get('name')?.invalid">Obrigatório</mat-error>
      </mat-form-field>

      <div class="grid">
        <mat-form-field appearance="fill">
          <mat-label>Grupo de Risco</mat-label>
          <mat-select formControlName="riskGroup">
            <mat-option value="fisico">Físico</mat-option>
            <mat-option value="quimico">Químico</mat-option>
            <mat-option value="biologico">Biológico</mat-option>
            <mat-option value="ergonomico">Ergonômico</mat-option>
            <mat-option value="acidente">Acidente</mat-option>
            <mat-option value="psicossocial">Psicossocial</mat-option>
          </mat-select>
          <mat-error *ngIf="(submitted || form.get('riskGroup')?.touched) && form.get('riskGroup')?.invalid">Obrigatório</mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Tipo de Avaliação</mat-label>
          <mat-select formControlName="evaluationType">
            <mat-option value="qualitativa">Qualitativa</mat-option>
            <mat-option value="quantitativa">Quantitativa</mat-option>
          </mat-select>
          <mat-error *ngIf="(submitted || form.get('evaluationType')?.touched) && form.get('evaluationType')?.invalid">Obrigatório</mat-error>
        </mat-form-field>
      </div>

      <mat-form-field appearance="fill" class="full">
        <mat-label>Descrição do Risco</mat-label>
        <textarea matInput rows="3" formControlName="description"></textarea>
        <mat-error *ngIf="(submitted || form.get('description')?.touched) && form.get('description')?.invalid">Obrigatório</mat-error>
      </mat-form-field>

      <div class="grid">
        <mat-form-field appearance="fill" *ngIf="form.get('evaluationType')?.value === 'quantitativa'">
          <mat-label>Valor Quantitativo</mat-label>
          <input matInput type="number" formControlName="quantitativeValue" />
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Limite de Tolerância</mat-label>
          <input matInput type="number" formControlName="toleranceLimit" />
        </mat-form-field>
      </div>

      <div class="grid">
        <mat-form-field appearance="fill">
          <mat-label>Código eSocial</mat-label>
          <input matInput formControlName="esocialCode" />
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Situação</mat-label>
          <mat-select formControlName="status">
            <mat-option value="ativo">Ativo</mat-option>
            <mat-option value="inativo">Inativo</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="grid">
        <mat-form-field appearance="fill">
          <mat-label>Método / Norma de avaliação</mat-label>
          <input matInput formControlName="evaluationMethod" />
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Unidade de medida</mat-label>
          <input matInput formControlName="measurementUnit" />
        </mat-form-field>
      </div>

      <div class="grid">
        <mat-form-field appearance="fill">
          <mat-label>Equipamento de medição</mat-label>
          <input matInput formControlName="measurementEquipment" />
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Nº Certificado de calibração</mat-label>
          <input matInput formControlName="calibrationCertificateNumber" />
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
    .risk-dialog { display: block; }
    .full { width: 100%; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RiskDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<RiskDialogComponent>);
  private readonly data = inject(MAT_DIALOG_DATA, { optional: true }) as any;
  private readonly fb = inject(FormBuilder);
  private readonly cd = inject(ChangeDetectorRef);

  submitted = false;

  form = this.fb.group({
    name: ['', [Validators.required]],
    riskGroup: ['fisico', [Validators.required]],
    description: ['', [Validators.required]],

    evaluationType: ['qualitativa', [Validators.required]],
    quantitativeValue: [null as any],
    toleranceLimit: [null as any],

    esocialCode: [''],
    evaluationMethod: [''],
    measurementUnit: [''],
    measurementEquipment: [''],
    calibrationCertificateNumber: [''],
    notes: [''],

    status: ['ativo', [Validators.required]],
  });

  constructor() {
    if (this.data) {
      this.form.patchValue({
        ...this.data,
        // garante exibição coerente no modo edição
        name: toUpperSafe(this.data?.name),
      });
    }

    // Ajusta exibição/limpeza do valor quantitativo quando troca tipo
    this.form.get('evaluationType')?.valueChanges.subscribe((t) => {
      if (t !== 'quantitativa') {
        this.form.patchValue({ quantitativeValue: null }, { emitEvent: false });
      }
      this.cd.markForCheck();
    });
  }

  normalizeName() {
    const current = this.form.get('name')?.value;
    const upper = toUpperSafe(current);
    if (upper !== current) {
      this.form.patchValue({ name: upper }, { emitEvent: false });
      this.cd.markForCheck();
    }
  }

  save() {
    this.submitted = true;
    this.normalizeName();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cd.markForCheck();
      return;
    }
    this.dialogRef.close(this.form.value);
  }

  cancel() {
    this.dialogRef.close(null);
  }
}
