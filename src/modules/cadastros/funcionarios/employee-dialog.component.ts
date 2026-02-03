import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { CompaniesRepository } from '../repositories/companies.repository';
import { UnitsRepository } from '../repositories/units.repository';
import { CargosRepository } from '../repositories/cargos.repository';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-employee-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatDialogModule, MatSelectModule, MatAutocompleteModule],
  template: `
    <h2 mat-dialog-title>Funcionário</h2>
    <mat-dialog-content [formGroup]="form">
      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Empresa</mat-label>
        <mat-select formControlName="companyId">
          <mat-option *ngFor="let c of companies" [value]="c.id">{{ c.name }}</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Unidade</mat-label>
        <mat-select formControlName="unitId">
          <mat-option *ngFor="let u of units" [value]="u.id">{{ u.name }}</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Nome</mat-label>
        <input matInput formControlName="name" />
      </mat-form-field>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>CPF</mat-label>
        <input matInput formControlName="cpf" />
      </mat-form-field>

      <!-- Cargo with autocomplete -->
      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Cargo</mat-label>
        <input type="text" matInput [formControl]="cargoCtrl" [matAutocomplete]="autoCargo" placeholder="Digite o nome ou CBO" />
        <mat-autocomplete #autoCargo="matAutocomplete" (optionSelected)="onCargoSelected($event.option.value)">
          <mat-option *ngFor="let c of (cargos$ | async)" [value]="c">{{ c.name }} — {{ c.cbo }}</mat-option>
          <mat-option *ngIf="loadingCargos" disabled>Carregando...</mat-option>
        </mat-autocomplete>
      </mat-form-field>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Status</mat-label>
        <mat-select formControlName="status">
          <mat-option value="ativo">Ativo</mat-option>
          <mat-option value="inativo">Inativo</mat-option>
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="form.invalid || !form.get('cargoId')?.value">Salvar</button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeDialogComponent {
  form!: FormGroup;
  cargoCtrl = new FormControl('');
  cargos$!: Observable<any[]>;
  loadingCargos = false;

  private readonly data = inject(MAT_DIALOG_DATA);
  private readonly companiesRepo = inject(CompaniesRepository);
  private readonly unitsRepo = inject(UnitsRepository);
  private readonly cargosRepo = inject(CargosRepository);

  companies: any[] = [];
  units: any[] = [];
  private selectedCargo: any | null = null;

  constructor(private dialogRef: MatDialogRef<any>, private fb: FormBuilder) {
    this.form = this.fb.group({
      companyId: ['', [Validators.required]],
      unitId: ['', [Validators.required]],
      name: ['', [Validators.required]],
      cpf: [''],
      cargoId: ['', [Validators.required]],
      status: ['ativo'],
    });

    if (this.data) {
      this.form.patchValue(this.data as any);
      // Pre-fill cargo control display if editing
      if ((this.data as any).cargoName) {
        this.cargoCtrl.setValue(`${(this.data as any).cargoName} — ${(this.data as any).cargoCbo}`);
      }
    }

    this.loadCompanies();

    // When company changes, refresh units and clear selected unit
    this.form.get('companyId')?.valueChanges.subscribe(async (v: string | null) => {
      this.units = v ? await this.unitsRepo.listBy('companyId' as any, v, 500) : [];
      this.form.patchValue({ unitId: '' });
    });

    // Setup cargo autocomplete stream
    this.cargos$ = this.cargoCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term: any) => {
        const t = typeof term === 'string' ? term : '';
        // If user starts typing after selecting, clear the selected cargoId
        if (this.selectedCargo && t && !t.includes(this.selectedCargo.cbo) && !t.includes(this.selectedCargo.name)) {
          this.selectedCargo = null;
          this.form.patchValue({ cargoId: '' });
        }
        if (!t || t.length < 1) return of([]);
        this.loadingCargos = true;
        return this.cargosRepo.searchByNameOrCbo(t?.toString().toUpperCase(), 20) as any;
      })
    ) as any;

    // Reset loading flag when results arrive
    this.cargos$.subscribe({ next: () => (this.loadingCargos = false), error: () => (this.loadingCargos = false) });
  }

  private async loadCompanies() {
    this.companies = await this.companiesRepo.listAll(500);
  }

  onCargoSelected(cargo: any) {
    this.selectedCargo = cargo;
    this.form.patchValue({ cargoId: cargo.id });
    this.cargoCtrl.setValue(`${cargo.name} — ${cargo.cbo}`);
  }

  save() {
    if (this.form.invalid || !this.form.get('cargoId')?.value) return;
    const v = this.form.value;
    const cargo = this.selectedCargo;
    const payload = { ...v, cargoName: cargo?.name ?? '', cargoCbo: cargo?.cbo ?? '' };
    this.dialogRef.close(payload);
  }
  cancel() { this.dialogRef.close(); }
}
