import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RisksRepository } from '../repositories/risks.repository';
import { Risk } from '../models/risk.model';

@Component({
  selector: 'app-cargo-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatSelectModule,
    MatChipsModule,
    MatIconModule,
    MatTooltipModule,
  ],
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
        <mat-label>GFIP</mat-label>
        <mat-select formControlName="gfip">
          <mat-option [value]="">Em branco</mat-option>
          <mat-option value="00">00</mat-option>
          <mat-option value="01">01</mat-option>
          <mat-option value="02">02</mat-option>
          <mat-option value="03">03</mat-option>
          <mat-option value="04">04</mat-option>
          <mat-option value="05">05</mat-option>
          <mat-option value="06">06</mat-option>
          <mat-option value="07">07</mat-option>
          <mat-option value="08">08</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Descrição</mat-label>
        <textarea matInput formControlName="description"></textarea>
      </mat-form-field>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Tarefa Prescrita</mat-label>
        <textarea matInput formControlName="notes"></textarea>
      </mat-form-field>

      <!-- Seção: Riscos Vinculados -->
      <div class="risks-section">
        <h3 class="section-title">Riscos Vinculados</h3>
        
        <mat-form-field appearance="fill" style="width:100%">
          <mat-label>Selecionar riscos</mat-label>
          <mat-select multiple [formControl]="selectedRisksCtrl" (selectionChange)="onRisksSelectionChange()">
            <mat-option *ngIf="risksLoading" disabled>Carregando riscos...</mat-option>
            <mat-option *ngFor="let risk of allRisks" [value]="risk.id">
              <span [ngClass]="'risk-option risk-' + risk.riskGroup">
                {{ risk.name }} - {{ getRiskGroupLabel(risk.riskGroup) }}
              </span>
            </mat-option>
          </mat-select>
          <mat-hint>Selecione um ou mais riscos</mat-hint>
        </mat-form-field>

        <!-- Badges dos riscos selecionados -->
        <div class="selected-risks" *ngIf="selectedRisks.length > 0">
          <span
            *ngFor="let risk of selectedRisks"
            class="risk-badge"
            [ngClass]="'risk-' + risk.riskGroup"
            [matTooltip]="risk.description || 'Sem descrição'"
          >
            {{ risk.name }} - {{ getRiskGroupLabel(risk.riskGroup) }}
            <button mat-icon-button class="remove-btn" (click)="removeRisk(risk.id)" aria-label="Remover risco">
              <mat-icon>close</mat-icon>
            </button>
          </span>
        </div>
        <div class="no-risks" *ngIf="selectedRisks.length === 0 && !risksLoading">
          <span class="hint-text">Nenhum risco vinculado.</span>
        </div>
      </div>

    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="save()">Salvar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .risks-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin: 0 0 12px 0;
    }
    .selected-risks {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .risk-badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 8px 6px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
      color: white;
      gap: 4px;
    }
    .risk-badge .remove-btn {
      width: 20px;
      height: 20px;
      line-height: 20px;
      margin-left: 4px;
    }
    .risk-badge .remove-btn mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: white;
    }
    .risk-option {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 13px;
      color: white;
    }
    .no-risks {
      margin-top: 8px;
    }
    .hint-text {
      color: #888;
      font-size: 12px;
      font-style: italic;
    }

    /* Cores por grupo de risco */
    .risk-fisico { background-color: #1976d2; }
    .risk-quimico { background-color: #f57c00; }
    .risk-biologico { background-color: #388e3c; }
    .risk-ergonomico { background-color: #7b1fa2; }
    .risk-acidente { background-color: #d32f2f; }
    .risk-psicossocial { background-color: #616161; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CargoDialogComponent implements OnInit {
  form!: FormGroup;
  private readonly data = inject(MAT_DIALOG_DATA);
  private readonly risksRepo = inject(RisksRepository);
  private readonly cd = inject(ChangeDetectorRef);

  // Todos os riscos disponíveis
  allRisks: Risk[] = [];
  risksLoading = false;

  // Controle do mat-select múltiplo
  selectedRisksCtrl = new FormControl<string[]>([]);

  // Riscos selecionados (com dados completos para exibição dos badges)
  selectedRisks: Risk[] = [];
  private selectedRiskIds: string[] = [];

  // Ordem de exibição dos grupos de risco
  private riskGroupOrder: Record<string, number> = {
    fisico: 1,
    quimico: 2,
    biologico: 3,
    ergonomico: 4,
    acidente: 5,
    psicossocial: 6,
  };

  // Mapeamento de labels para grupos de risco
  private riskGroupLabels: Record<string, string> = {
    fisico: 'Físico',
    quimico: 'Químico',
    biologico: 'Biológico',
    ergonomico: 'Ergonômico',
    acidente: 'Acidente',
    psicossocial: 'Psicossocial',
  };

  constructor(private dialogRef: MatDialogRef<any>, private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', [Validators.required]],
      cbo: ['', [Validators.required]],
      gfip: [''],
      description: [''],
      notes: [''],
    });

    if (this.data) {
      this.form.patchValue(this.data as any);
      // Carregar riskIds existentes
      if ((this.data as any).riskIds && Array.isArray((this.data as any).riskIds)) {
        this.selectedRiskIds = [...(this.data as any).riskIds];
      }
    }
  }

  async ngOnInit() {
    // Carregar todos os riscos disponíveis
    await this.loadAllRisks();

    // Se houver riscos já vinculados, marcar no select e carregar badges
    if (this.selectedRiskIds.length > 0) {
      this.selectedRisksCtrl.setValue(this.selectedRiskIds);
      this.updateSelectedRisksBadges();
    }
  }

  private async loadAllRisks() {
    this.risksLoading = true;
    this.cd.markForCheck();

    try {
      // Carregar todos os riscos ativos (limite alto para pegar todos)
      const result = await this.risksRepo.listByNamePaged(null, '', 500);
      const risks = (result.docs || []).filter((r) => r.status === 'ativo');
      // Ordenar por grupo de risco
      this.allRisks = this.sortByRiskGroup(risks);
    } catch {
      this.allRisks = [];
    } finally {
      this.risksLoading = false;
      this.cd.markForCheck();
    }
  }

  getRiskGroupLabel(group: string): string {
    return this.riskGroupLabels[group] || group;
  }

  onRisksSelectionChange() {
    this.selectedRiskIds = this.selectedRisksCtrl.value || [];
    this.updateSelectedRisksBadges();
  }

  private updateSelectedRisksBadges() {
    const filtered = this.allRisks.filter((r) => this.selectedRiskIds.includes(r.id));
    // Ordenar por grupo de risco
    this.selectedRisks = this.sortByRiskGroup(filtered);
    this.cd.markForCheck();
  }

  private sortByRiskGroup(risks: Risk[]): Risk[] {
    return [...risks].sort((a, b) => {
      const orderA = this.riskGroupOrder[a.riskGroup] ?? 99;
      const orderB = this.riskGroupOrder[b.riskGroup] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      // Se mesmo grupo, ordenar por nome
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  removeRisk(riskId: string) {
    this.selectedRiskIds = this.selectedRiskIds.filter((id) => id !== riskId);
    this.selectedRisksCtrl.setValue(this.selectedRiskIds);
    this.updateSelectedRisksBadges();
  }

  save() {
    if (this.form.invalid) return;
    this.dialogRef.close({
      ...this.form.value,
      riskIds: this.selectedRiskIds,
    });
  }

  cancel() {
    this.dialogRef.close();
  }
}
