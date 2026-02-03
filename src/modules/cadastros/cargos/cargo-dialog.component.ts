import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-cargo-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Cargo</h2>
    <mat-dialog-content [formGroup]="form">
      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Nome</mat-label>
        <input matInput formControlName="name" />
        <mat-error *ngIf="form.controls['name']?.invalid">Nome é obrigatório</mat-error>
      </mat-form-field>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>CBO</mat-label>
        <input matInput formControlName="cbo" />
        <mat-error *ngIf="form.controls['cbo']?.invalid">CBO é obrigatório</mat-error>
      </mat-form-field>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Descrição</mat-label>
        <textarea matInput formControlName="description"></textarea>
      </mat-form-field>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Notas</mat-label>
        <textarea matInput formControlName="notes"></textarea>
      </mat-form-field>

    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="save()">Salvar</button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CargoDialogComponent {
  form!: FormGroup;
  private readonly data = inject(MAT_DIALOG_DATA);

  constructor(private dialogRef: MatDialogRef<any>, private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', [Validators.required]],
      cbo: ['', [Validators.required]],
      description: [''],
      notes: [''],
    });
    if (this.data) this.form.patchValue(this.data as any);
  }

  save() {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.value);
  }

  cancel() { this.dialogRef.close(); }
}
