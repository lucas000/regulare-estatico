import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CompaniesRepository } from '../repositories/companies.repository';
import { Company } from '../models/company.model';
import { LocalidadesService, Estado, Municipio } from '../../../core/services/localidades.service';

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
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>Unidade</h2>
    <mat-dialog-content [formGroup]="form">
      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Nome</mat-label>
        <input matInput formControlName="name" />
      </mat-form-field>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Estado</mat-label>
        <mat-select formControlName="state">
          <mat-option *ngFor="let estado of estados" [value]="estado.sigla">{{ estado.nome }}</mat-option>
        </mat-select>
        <mat-error *ngIf="form.controls['state']?.invalid"
          >Estado é obrigatório</mat-error
        >
      </mat-form-field>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Município</mat-label>
        <mat-select formControlName="city" [disabled]="loadingMunicipios || !form.get('state')?.value">
          <mat-option *ngIf="loadingMunicipios" disabled>Carregando municípios...</mat-option>
          <mat-option *ngFor="let municipio of municipios" [value]="municipio.nome">{{ municipio.nome }}</mat-option>
        </mat-select>
        <mat-error *ngIf="form.controls['city']?.invalid"
          >Cidade é obrigatória</mat-error
        >
      </mat-form-field>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Empresa</mat-label>
        <mat-select formControlName="companyId">
          <mat-option *ngFor="let c of companies" [value]="c.id">{{ c.name }}</mat-option>
        </mat-select>
        <mat-error *ngIf="form.controls['companyId']?.invalid"
          >Empresa é obrigatória</mat-error
        >
      </mat-form-field>

      <div *ngIf="loadingMunicipios" style="text-align: center; margin-top: 16px">
        <mat-spinner diameter="24"></mat-spinner>
      </div>
      <div *ngIf="municipiosError" style="color: red; margin-top: 16px">
        {{ municipiosError }}
      </div>
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
  private readonly localidades = inject(LocalidadesService);
  companies: Company[] = [];
  estados: Estado[] = [];
  municipios: Municipio[] = [];
  loadingMunicipios = false;
  municipiosError: string | null = null;

  constructor(private dialogRef: MatDialogRef<any>, private fb: FormBuilder) {
    this.form = this.fb.group({
      companyId: ['', [Validators.required]],
      name: ['', [Validators.required]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
    });
    if (this.data) this.form.patchValue(this.data as any);
    this.loadCompanies();
    this.loadEstados();
    // react to estado change to load municipios
    this.form.get('state')?.valueChanges.subscribe((uf: string | null) => {
      this.municipios = [];
      this.form.patchValue({ city: '' });
      this.municipiosError = null;
      if (!uf) return;
      this.loadMunicipios(uf);
    });
  }

  private async loadCompanies() {
    const all = await this.companiesRepo.listAll();
    this.companies = all.filter((c) => c.status === 'ativo');
    // Ensure that when editing, company selection is preselected
    if (this.data && this.data.companyId) {
      this.form.patchValue({ companyId: (this.data as any).companyId });
    }
  }

  private loadEstados() {
    this.localidades.getEstados().subscribe({
      next: (list) => {
        this.estados = list.sort((a, b) => a.nome.localeCompare(b.nome));
        // If we are editing and an estado is already present in the form/data, load its municipios
        const presetUf = this.form.get('state')?.value as string | null;
        if (presetUf) {
          this.loadMunicipios(presetUf);
        }
      },
      error: (err) => {
        console.error('Erro carregando estados', err);
      },
    });
  }

  private loadMunicipios(uf: string) {
    this.loadingMunicipios = true;
    this.municipiosError = null;
    this.localidades.getMunicipiosByUF(uf).subscribe({
      next: (list) => {
        this.municipios = list.sort((a, b) => a.nome.localeCompare(b.nome));
        // If we are editing and a cidade/city was provided in the incoming data, preselect it
        if (this.data) {
          const incomingCity = (this.data as any).city ?? (this.data as any).cidade ?? null;
          if (incomingCity) {
            // patch after municipios are available
            this.form.patchValue({ city: incomingCity });
          }
        }
        this.loadingMunicipios = false;
      },
      error: (err) => {
        console.error('Erro carregando municípios', err);
        this.municipiosError = 'Erro ao carregar municípios';
        this.loadingMunicipios = false;
      },
    });
  }

  save() {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.value);
  }

  cancel() {
    this.dialogRef.close();
  }
}
