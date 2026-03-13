import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
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
import { Equipment } from '../models/equipment.model';
import { AuditHistoryDialogComponent, AuditHistoryData } from '../../../core/components/audit-history-dialog.component';
import { SessionService } from '../../../core/services/session.service';
import { CompanyRisksService } from '../services/company-risks.service';
import { CompanyEquipmentsService } from '../services/company-equipments.service';
import { EquipmentsRepository } from '../repositories/equipments.repository';

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
    <div class="dialog-header">
      <h2 mat-dialog-title>{{ readOnly ? 'Visualizar Cargo' : 'Cargo' }}</h2>
      <button 
        *ngIf="isEdit" 
        mat-icon-button 
        class="audit-btn"
        matTooltip="Histórico de alterações"
        (click)="openAuditHistory()">
        <mat-icon>history</mat-icon>
      </button>
    </div>
    <mat-dialog-content [formGroup]="form">
      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Nome</mat-label>
        <input matInput formControlName="name" [readonly]="readOnly" />
        <mat-error *ngIf="form.controls['name']?.invalid">Nome é obrigatório</mat-error>
      </mat-form-field>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>CBO</mat-label>
        <input matInput formControlName="cbo" [readonly]="readOnly" />
        <mat-error *ngIf="form.controls['cbo']?.invalid">CBO é obrigatório</mat-error>
      </mat-form-field>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>GFIP</mat-label>
        <mat-select formControlName="gfip" [disabled]="readOnly">
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
        <textarea matInput formControlName="description" [readonly]="readOnly"></textarea>
      </mat-form-field>

      <mat-form-field appearance="fill" style="width:100%">
        <mat-label>Tarefa Prescrita</mat-label>
        <textarea matInput formControlName="notes" [readonly]="readOnly"></textarea>
      </mat-form-field>

      <!-- Seção: Riscos Vinculados -->
      <div class="risks-section" *ngIf="!isAdminGlobalView">
        <h3 class="section-title">Riscos Vinculados</h3>
        
        <mat-form-field appearance="fill" style="width:100%" *ngIf="!readOnly && !isAdminGlobalView">
          <mat-label>Selecionar riscos</mat-label>
          <mat-select 
            multiple 
            [formControl]="selectedRisksCtrl" 
            (selectionChange)="onRisksSelectionChange()">
            <mat-option *ngFor="let risk of allRisks" [value]="risk.id">
              <span [ngClass]="'risk-option risk-' + risk.riskGroup">
                {{ risk.name }} - {{ getRiskGroupLabel(risk.riskGroup) }}
              </span>
            </mat-option>
          </mat-select>
          <mat-hint>Selecione um ou mais riscos</mat-hint>
        </mat-form-field>

        <!-- Badges dos riscos selecionados -->
        <div class="selected-items" *ngIf="!isAdminGlobalView && selectedRisks.length > 0">
          <span
            *ngFor="let risk of selectedRisks"
            class="risk-badge"
            [ngClass]="'risk-' + risk.riskGroup"
            [matTooltip]="risk.description || 'Sem descrição'"
          >
            {{ risk.name }} - {{ getRiskGroupLabel(risk.riskGroup) }}
            <button *ngIf="!readOnly" mat-icon-button class="remove-btn" (click)="removeRisk(risk.id)" aria-label="Remover risco">
              <mat-icon>close</mat-icon>
            </button>
          </span>
        </div>
        <div class="no-items" *ngIf="selectedRisks.length === 0 && !risksLoading">
          <span class="hint-text">Nenhum risco vinculado.</span>
        </div>
      </div>

      <!-- Seção: EPIS Vinculados -->
      <div class="risks-section" *ngIf="!isAdminGlobalView">
        <h3 class="section-title">EPIS Vinculados</h3>
        
        <mat-form-field appearance="fill" style="width:100%" *ngIf="!readOnly && !isAdminGlobalView">
          <mat-label>Selecionar EPIS</mat-label>
          <mat-select 
            multiple 
            [formControl]="selectedEpisCtrl" 
            (selectionChange)="onEpisSelectionChange()">
            <mat-option *ngFor="let epi of allEpis" [value]="epi.id">
              {{ epi.name }} {{ epi.certificationNumber ? '- CA ' + epi.certificationNumber : '' }}
            </mat-option>
          </mat-select>
          <mat-hint>Selecione um ou mais EPIS</mat-hint>
        </mat-form-field>

        <!-- Badges dos EPIS selecionados -->
        <div class="selected-items" *ngIf="!isAdminGlobalView && selectedEpis.length > 0">
          <span
            *ngFor="let epi of selectedEpis"
            class="epi-badge"
            [matTooltip]="epi.notes || 'Sem observações'"
          >
            {{ epi.name }} {{ epi.certificationNumber ? '- CA ' + epi.certificationNumber : '' }}
            <button *ngIf="!readOnly" mat-icon-button class="remove-btn" (click)="removeEpi(epi.id)" aria-label="Remover EPI">
              <mat-icon>close</mat-icon>
            </button>
          </span>
        </div>
        <div class="no-items" *ngIf="selectedEpis.length === 0 && !episLoading">
          <span class="hint-text">Nenhum EPI vinculado.</span>
        </div>
      </div>

    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">{{ readOnly ? 'Fechar' : 'Cancelar' }}</button>
      <button *ngIf="!readOnly" mat-flat-button color="primary" (click)="save()">Salvar</button>
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
    .selected-items {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .risk-badge, .epi-badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 8px 6px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
      color: white;
      gap: 4px;
    }
    .epi-badge {
      background-color: #455a64;
    }
    .risk-badge .remove-btn, .epi-badge .remove-btn {
      width: 20px;
      height: 20px;
      line-height: 20px;
      margin-left: 4px;
    }
    .risk-badge .remove-btn mat-icon, .epi-badge .remove-btn mat-icon {
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
    .no-items {
      margin-top: 8px;
    }
    .hint-text {
      color: #888;
      font-size: 12px;
      font-style: italic;
    }

    /* Cores por grupo de risco (ajustadas conforme solicitação)
       Acidentes - Azul; Biológicos - Marrom; Ergonômico - Amarelo; Físico - Verde; Químico - Vermelho */
    .risk-fisico { background-color: #388e3c; }
    .risk-quimico { background-color: #d32f2f; }
    .risk-biologico { background-color: #795548; }
    .risk-ergonomico { background-color: #fbc02d; }
    .risk-acidente { background-color: #1976d2; }
    .risk-psicossocial { background-color: #616161; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CargoDialogComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  readOnly = false;
  private readonly data = inject(MAT_DIALOG_DATA);
  private readonly risksRepo = inject(RisksRepository);
  private readonly equipmentsRepo = inject(EquipmentsRepository);
  private readonly session = inject(SessionService);
  private readonly companyRisksService = inject(CompanyRisksService);
  private readonly companyEquipmentsService = inject(CompanyEquipmentsService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly auditDialog = inject(MatDialog);

  // Todos os riscos disponíveis
  allRisks: Risk[] = [];
  risksLoading = false;

  // Todos os EPIS disponíveis
  allEpis: Equipment[] = [];
  episLoading = false;

  // Controle do mat-select múltiplo
  selectedRisksCtrl = new FormControl<string[]>([]);
  selectedEpisCtrl = new FormControl<string[]>([]);

  // Riscos selecionados (com dados completos para exibição dos badges)
  selectedRisks: Risk[] = [];
  private selectedRiskIds: string[] = [];

  // EPIS selecionados (com dados completos para exibição dos badges)
  selectedEpis: Equipment[] = [];
  private selectedEpiIds: string[] = [];

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

  get isAdminGlobalView(): boolean {
    const isAdmin = this.session.hasRole(['ADMIN'] as any);
    const adminScopeCompanyId = this.session.adminScopeCompanyId ? this.session.adminScopeCompanyId() : null;
    return isAdmin && !adminScopeCompanyId;
  }

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
      this.isEdit = !!this.data.id;
      this.readOnly = !!(this.data as any).readOnly;
      // Carregar riskIds existentes
      if ((this.data as any).riskIds && Array.isArray((this.data as any).riskIds)) {
        this.selectedRiskIds = [...(this.data as any).riskIds];
      }
      // Carregar epiIds existentes
      if ((this.data as any).epiIds && Array.isArray((this.data as any).epiIds)) {
        this.selectedEpiIds = [...(this.data as any).epiIds];
      }
    }
  }

  async ngOnInit() {
    // Carregar todos os riscos disponíveis
    await this.loadAllRisks();
    // Carregar todos os EPIS disponíveis
    await this.loadAllEpis();

    // Se houver riscos já vinculados, marcar no select e carregar badges
    if (this.selectedRiskIds.length > 0) {
      this.selectedRisksCtrl.setValue(this.selectedRiskIds);
      this.updateSelectedRisksBadges();
    }
    // Se houver EPIS já vinculados, marcar no select e carregar badges
    if (this.selectedEpiIds.length > 0) {
      this.selectedEpisCtrl.setValue(this.selectedEpiIds);
      this.updateSelectedEpisBadges();
    }
  }

  private async loadAllRisks() {
    this.risksLoading = true;
    this.cd.markForCheck();

    try {
      // Determine scope: if CLIENTE or ADMIN with company selected -> load company risks
      const isAdmin = this.session.hasRole(['ADMIN'] as any);
      const adminScopeCompanyId = this.session.adminScopeCompanyId ? this.session.adminScopeCompanyId() : null;
      const companyId = isAdmin ? (adminScopeCompanyId ?? '') : (this.session.user()?.companyId ?? '');

      if (companyId) {
        const list = await this.companyRisksService.listByCompany(companyId);
        const risks = (list || []).filter((r) => r.status === 'ativo');
        this.allRisks = this.sortByRiskGroup(risks as Risk[]);
      } else {
        // GLOBAL VIEW - Disable linking risks as per requirement
        this.allRisks = [];
        // Se houver riscos vinculados vindos do banco (em visão global), precisamos carregá-los 
        // apenas para exibição dos badges, mas o select estará desabilitado.
        if (this.selectedRiskIds.length > 0) {
           const result = await this.risksRepo.listByNamePaged(null, '', 500);
           const risks = (result.docs || []).filter((r: Risk) => this.selectedRiskIds.includes(r.id));
           this.allRisks = this.sortByRiskGroup(risks as Risk[]);
        }
      }
    } catch (e) {
      this.allRisks = [];
    } finally {
      this.risksLoading = false;
      this.cd.markForCheck();
    }
  }

  private async loadAllEpis() {
    this.episLoading = true;
    this.cd.markForCheck();

    try {
      const isAdmin = this.session.hasRole(['ADMIN'] as any);
      const adminScopeCompanyId = this.session.adminScopeCompanyId ? this.session.adminScopeCompanyId() : null;
      const companyId = isAdmin ? (adminScopeCompanyId ?? '') : (this.session.user()?.companyId ?? '');

      if (companyId) {
        const list = await this.companyEquipmentsService.listByCompany(companyId);
        this.allEpis = (list || [])
          .filter((e) => e.status === 'ativo' && e.type === 'EPI')
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      } else {
        // GLOBAL VIEW - Disable linking EPIs as per requirement
        this.allEpis = [];
        // Se houver EPIs vinculados vindos do banco (em visão global), carregamos apenas eles para os badges
        if (this.selectedEpiIds.length > 0) {
            const result = await this.equipmentsRepo.listByNamePaged('', 1000);
            this.allEpis = (result.docs || [])
              .filter((e) => this.selectedEpiIds.includes(e.id))
              .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }
      }
    } catch (e) {
      this.allEpis = [];
    } finally {
      this.episLoading = false;
      this.cd.markForCheck();
    }
  }

  getRiskGroupLabel(group: string): string {
    return this.riskGroupLabels[group].toUpperCase() || group.toUpperCase();
  }

  onRisksSelectionChange() {
    this.selectedRiskIds = this.selectedRisksCtrl.value || [];
    this.updateSelectedRisksBadges();
  }

  onEpisSelectionChange() {
    this.selectedEpiIds = this.selectedEpisCtrl.value || [];
    this.updateSelectedEpisBadges();
  }

  private updateSelectedRisksBadges() {
    const filtered = this.allRisks.filter((r) => this.selectedRiskIds.includes(r.id));
    // Ordenar por grupo de risco
    this.selectedRisks = this.sortByRiskGroup(filtered);
    this.cd.markForCheck();
  }

  private updateSelectedEpisBadges() {
    const filtered = this.allEpis.filter((e) => this.selectedEpiIds.includes(e.id));
    this.selectedEpis = [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
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

  removeEpi(epiId: string) {
    this.selectedEpiIds = this.selectedEpiIds.filter((id) => id !== epiId);
    this.selectedEpisCtrl.setValue(this.selectedEpiIds);
    this.updateSelectedEpisBadges();
  }

  save() {
    if (this.form.invalid) return;
    this.dialogRef.close({
      ...this.form.value,
      riskIds: this.selectedRiskIds,
      epiIds: this.selectedEpiIds,
    });
  }

  cancel() {
    this.dialogRef.close();
  }

  openAuditHistory(): void {
    const auditData: AuditHistoryData = {
      title: 'Cargo',
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
