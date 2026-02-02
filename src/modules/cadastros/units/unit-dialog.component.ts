import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { CompaniesRepository } from '../repositories/companies.repository';
import { Company } from '../models/company.model';

@Component({
  selector: 'app-unit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatSelectModule,
    MatOptionModule,
  ],
  template: `
    <h2 mat-dialog-title>Unidade</h2>
    <mat-dialog-content [formGroup]="form">
      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Nome</mat-label>
        <input matInput formControlName="nome" />
      </mat-form-field>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Cidade</mat-label>
        <input matInput formControlName="cidade" />
      </mat-form-field>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Estado</mat-label>
        <input matInput formControlName="estado" />
      </mat-form-field>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Empresa</mat-label>
        <mat-select formControlName="companyId">
          <mat-option *ngFor="let c of companies" [value]="c.id">{{
            c.nome
          }}</mat-option>
        </mat-select>
        <mat-error *ngIf="form.controls['companyId']?.invalid"
          >Empresa é obrigatória</mat-error
        >
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="save()">Salvar</button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitDialogComponent {
  form!: FormGroup;
  private readonly data = inject(MAT_DIALOG_DATA);
  private readonly companiesRepo = inject(CompaniesRepository);
  companies: Company[] = [];

  constructor(private dialogRef: MatDialogRef<any>, private fb: FormBuilder) {
    this.form = this.fb.group({
      companyId: ['', [Validators.required]],
      nome: ['', [Validators.required]],
      cidade: [''],
      estado: [''],
    });
    if (this.data) this.form.patchValue(this.data as any);
    this.loadCompanies();
  }

  private async loadCompanies() {
    const all = await this.companiesRepo.listAll();
    this.companies = all.filter((c) => c.status === 'ativo');
    // Ensure that when editing, company selection is preselected
    if (this.data && this.data.companyId) {
      this.form.patchValue({ companyId: (this.data as any).companyId });
    }
  }

  save() {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.value);
  }

  cancel() {
    this.dialogRef.close();
  }
}
