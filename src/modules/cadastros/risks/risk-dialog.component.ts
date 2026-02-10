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
          <mat-label>Tipo de Risco</mat-label>
          <mat-select formControlName="riskType">
            <mat-option value="qualitativa">Qualitativo</mat-option>
            <mat-option value="quantitativa">Quantitativo</mat-option>
          </mat-select>
          <mat-error *ngIf="(submitted || form.get('riskType')?.touched) && form.get('riskType')?.invalid">Obrigatório</mat-error>
        </mat-form-field>
      </div>

      <mat-form-field appearance="fill" class="full">
        <mat-label>Descrição do Risco</mat-label>
        <textarea matInput rows="3" formControlName="description"></textarea>
        <mat-error *ngIf="(submitted || form.get('description')?.touched) && form.get('description')?.invalid">Obrigatório</mat-error>
      </mat-form-field>

      <!-- Classificações obrigatórias (sempre) -->
      <div class="grid">
        <mat-form-field appearance="fill">
          <mat-label>Classificação do Efeito</mat-label>
          <mat-select formControlName="effectClassification">
            <mat-option value="Leve">Leve</mat-option>
            <mat-option value="Moderado">Moderado</mat-option>
            <mat-option value="Sério">Sério</mat-option>
            <mat-option value="Severo">Severo</mat-option>
          </mat-select>
          <mat-error *ngIf="(submitted || form.get('effectClassification')?.touched) && form.get('effectClassification')?.invalid">Obrigatório</mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Frequência</mat-label>
          <mat-select formControlName="frequency">
            <mat-option value="Ocasional">Ocasional</mat-option>
            <mat-option value="Intermitente">Intermitente</mat-option>
            <mat-option value="Habitual">Habitual</mat-option>
            <mat-option value="Permanente">Permanente</mat-option>
          </mat-select>
          <mat-error *ngIf="(submitted || form.get('frequency')?.touched) && form.get('frequency')?.invalid">Obrigatório</mat-error>
        </mat-form-field>
      </div>

      <div class="grid">
        <mat-form-field appearance="fill">
          <mat-label>Classificação do Risco</mat-label>
          <mat-select formControlName="riskClassification">
            <mat-option value="Aceitável">Aceitável</mat-option>
            <mat-option value="Tolerável">Tolerável</mat-option>
            <mat-option value="Não aceitável">Não aceitável</mat-option>
          </mat-select>
          <mat-error *ngIf="(submitted || form.get('riskClassification')?.touched) && form.get('riskClassification')?.invalid">Obrigatório</mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Situação</mat-label>
          <mat-select formControlName="status">
            <mat-option value="ativo">Ativo</mat-option>
            <mat-option value="inativo">Inativo</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Campos quantitativos: somente quando riskType = quantitativa -->
      <div class="grid" *ngIf="form.get('riskType')?.value === 'quantitativa'">
        <mat-form-field appearance="fill">
          <mat-label>Valor Quantitativo</mat-label>
          <input matInput type="number" formControlName="quantitativeValue" />
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Limite de Tolerância</mat-label>
          <input matInput type="number" formControlName="toleranceLimit" />
        </mat-form-field>
      </div>

      <div class="grid" *ngIf="form.get('riskType')?.value === 'quantitativa'">
        <mat-form-field appearance="fill">
          <mat-label>Unidade de medida</mat-label>
          <input matInput formControlName="measurementUnit" />
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Equipamento de medição</mat-label>
          <input matInput formControlName="measurementEquipment" />
        </mat-form-field>
      </div>

      <div class="grid" *ngIf="form.get('riskType')?.value === 'quantitativa'">
        <mat-form-field appearance="fill">
          <mat-label>Nº Certificado de calibração</mat-label>
          <input matInput formControlName="calibrationCertificateNumber" />
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Método / Norma de avaliação</mat-label>
          <input matInput formControlName="evaluationMethod" />
        </mat-form-field>
      </div>

      <div class="grid">
        <mat-form-field appearance="fill">
          <mat-label>Código eSocial</mat-label>
          <input matInput formControlName="esocialCode" />
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

    // controlador (qualitativo/quantitativo)
    riskType: ['qualitativa', [Validators.required]],

    // classificações obrigatórias
    effectClassification: ['', [Validators.required]],
    frequency: ['', [Validators.required]],
    riskClassification: ['', [Validators.required]],

    // campos quantitativos (só quando riskType=quantitativa)
    quantitativeValue: [null as any],
    toleranceLimit: [null as any],
    measurementUnit: [''],
    measurementEquipment: [''],
    calibrationCertificateNumber: [''],

    esocialCode: [''],
    evaluationMethod: [''],
    notes: [''],

    status: ['ativo', [Validators.required]],
  });

  constructor() {
    if (this.data) {
      // Compatibilidade com versão anterior: pode vir evaluationType
      const incomingType = this.data?.riskType ?? this.data?.evaluationType;

      this.form.patchValue({
        ...this.data,
        riskType: incomingType ?? 'qualitativa',
        // garante exibição coerente no modo edição
        name: toUpperSafe(this.data?.name),
      });

      // Ao abrir em modo edição, aplicar regras imediatamente
      this.applyRiskTypeRules(this.form.get('riskType')?.value);
    } else {
      this.applyRiskTypeRules(this.form.get('riskType')?.value);
    }

    // Alterna regras conforme tipo
    this.form.get('riskType')?.valueChanges.subscribe((t) => {
      this.applyRiskTypeRules(t);
      this.cd.markForCheck();
    });
  }

  private applyRiskTypeRules(t: any) {
    const isQuant = t === 'quantitativa';

    const quantitativeValue = this.form.get('quantitativeValue');
    const toleranceLimit = this.form.get('toleranceLimit');
    const measurementUnit = this.form.get('measurementUnit');
    const measurementEquipment = this.form.get('measurementEquipment');
    const calibrationCertificateNumber = this.form.get('calibrationCertificateNumber');
    const evaluationMethod = this.form.get('evaluationMethod');

    if (!isQuant) {
      // qualitativo: limpar e remover validações
      quantitativeValue?.clearValidators();
      toleranceLimit?.clearValidators();
      measurementUnit?.clearValidators();
      measurementEquipment?.clearValidators();
      calibrationCertificateNumber?.clearValidators();
      evaluationMethod?.clearValidators();

      this.form.patchValue(
        {
          quantitativeValue: null,
          toleranceLimit: null,
          measurementUnit: '',
          measurementEquipment: '',
          calibrationCertificateNumber: '',
          evaluationMethod: '',
        },
        { emitEvent: false }
      );
    } else {
      // quantitativo: manter campos disponíveis; validações apenas se você desejar (MVP não exige)
      quantitativeValue?.clearValidators();
      toleranceLimit?.clearValidators();
      measurementUnit?.clearValidators();
      measurementEquipment?.clearValidators();
      calibrationCertificateNumber?.clearValidators();
      evaluationMethod?.clearValidators();
    }

    quantitativeValue?.updateValueAndValidity({ emitEvent: false });
    toleranceLimit?.updateValueAndValidity({ emitEvent: false });
    measurementUnit?.updateValueAndValidity({ emitEvent: false });
    measurementEquipment?.updateValueAndValidity({ emitEvent: false });
    calibrationCertificateNumber?.updateValueAndValidity({ emitEvent: false });
    evaluationMethod?.updateValueAndValidity({ emitEvent: false });
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

    const v: any = { ...this.form.value };

    // Firestore: campos quantitativos só quando aplicável
    if (v.riskType !== 'quantitativa') {
      delete v.quantitativeValue;
      delete v.toleranceLimit;
      delete v.measurementUnit;
      delete v.measurementEquipment;
      delete v.calibrationCertificateNumber;
      delete v.evaluationMethod;
    }

    // remove campos antigos caso existam
    delete v.evaluationType;

    this.dialogRef.close(v);
  }

  cancel() {
    this.dialogRef.close(null);
  }
}
