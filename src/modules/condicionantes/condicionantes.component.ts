import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { LicenseConditionsService } from '../licencas/services/license-conditions.service';
import { LicenseCondition, daysUntilExpiration } from '../licencas/models/license.model';
import { SessionService } from '../../core/services/session.service';
import { CompaniesRepository } from '../cadastros/repositories/companies.repository';
import { Company } from '../cadastros/models/company.model';

@Component({
  selector: 'app-condicionantes',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatPaginatorModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    ReactiveFormsModule,
  ],
  templateUrl: './condicionantes.component.html',
  styleUrls: ['./condicionantes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CondicionantesComponent implements OnInit, OnDestroy {
  private readonly conditionsService = inject(LicenseConditionsService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly snack = inject(MatSnackBar);
  private readonly session = inject(SessionService);
  private readonly companiesRepo = inject(CompaniesRepository);

  // Dados
  conditions: LicenseCondition[] = [];
  dataSource = new MatTableDataSource<LicenseCondition>([]);
  companies: Company[] = [];

  // Colunas
  columns = ['company', 'description', 'dueDate', 'daysRemaining', 'status', 'evidence', 'acoes'];

  // Filtros
  companyFilter = new FormControl<string>('');
  statusFilter = new FormControl<string>('');
  searchControl = new FormControl<string>('');

  // Paginação
  pageSize = 30;
  pageIndex = 0;
  total = 0;

  loading = false;
  private subs = new Subscription();

  @ViewChild(MatPaginator) paginator?: MatPaginator;

  ngOnInit(): void {
    this.loadCompanies();
    this.setupFilters();
    // Carregamento inicial ocorrerá ao final de loadCompanies(),
    // garantindo que empresas/escopo estejam definidos antes da busca
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private setupFilters(): void {
    this.subs.add(
      this.searchControl.valueChanges
        .pipe(debounceTime(300), distinctUntilChanged())
        .subscribe(() => this.loadConditions())
    );

    // Filtros inteligentes - disparam busca ao alterar
    this.subs.add(
      this.companyFilter.valueChanges.subscribe(() => this.loadConditions())
    );
    this.subs.add(
      this.statusFilter.valueChanges.subscribe(() => this.loadConditions())
    );
  }

  private async loadCompanies(): Promise<void> {
    try {
      const user = this.session.user();
      const isAdmin = this.session.hasRole(['ADMIN']);

      if (isAdmin) {
        const scopeId = this.session.adminScopeCompanyId();
        if (scopeId) {
          const comp = await this.companiesRepo.getById(scopeId);
          this.companies = comp ? [comp] : [];
          this.companyFilter.setValue(scopeId);
        } else {
          this.companies = await this.companiesRepo.listAll(500);
          // ADMIN sem escopo: carrega imediatamente com todas as empresas listadas (limitado)
          await this.loadConditions();
        }
      } else if (user?.companyId) {
        const comp = await this.companiesRepo.getById(user.companyId);
        this.companies = comp ? [comp] : [];
        this.companyFilter.setValue(user.companyId);
        this.companyFilter.disable();
      }

      this.cd.markForCheck();
    } catch (e) {
      console.error('Erro ao carregar empresas', e);
    }
  }

  async loadConditions(): Promise<void> {
    this.loading = true;
    this.cd.markForCheck();

    try {
      const companyId = this.companyFilter.value || undefined;
      let allConditions: LicenseCondition[] = [];

      if (companyId) {
        allConditions = await this.conditionsService.listByCompany(companyId, 500);
      } else {
        // Para admin sem escopo, carregar todas (limitado)
        for (const comp of this.companies.slice(0, 10)) {
          const conds = await this.conditionsService.listByCompany(comp.id, 100);
          allConditions.push(...conds);
        }
      }

      // Filtrar por status
      const statusFilter = this.statusFilter.value;
      if (statusFilter) {
        allConditions = allConditions.filter(c => c.status === statusFilter);
      }

      // Filtrar por termo de busca
      const term = this.searchControl.value?.trim().toUpperCase();
      if (term) {
        allConditions = allConditions.filter(c => c.description?.toUpperCase().includes(term));
      }

      this.conditions = allConditions;
      this.dataSource.data = this.conditions;
      this.total = this.conditions.length;

      if (this.paginator) {
        this.paginator.length = this.total;
      }
    } catch (e) {
      console.error('Erro ao carregar condicionantes', e);
      this.snack.open('Erro ao carregar condicionantes', 'OK', { duration: 3000 });
    } finally {
      this.loading = false;
      this.cd.markForCheck();
    }
  }

  applyFilters(): void {
    this.loadConditions();
  }

  clearFilters(): void {
    const isAdmin = this.session.hasRole(['ADMIN']);
    const scopeId = this.session.adminScopeCompanyId();

    if (isAdmin && !scopeId) {
      this.companyFilter.setValue('');
    }
    this.statusFilter.setValue('');
    this.searchControl.setValue('');
    this.loadConditions();
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  // Helpers
  getDaysRemaining(cond: LicenseCondition): string {
    const days = daysUntilExpiration(cond.dueDate);
    if (days < -9000) return '-';
    if (days < 0) return `${Math.abs(days)} dias vencida`;
    if (days === 0) return 'Vence hoje';
    return `${days} dias`;
  }

  getDaysClass(cond: LicenseCondition): string {
    const days = daysUntilExpiration(cond.dueDate);
    if (days < 0) return 'days-danger';
    if (days <= 15) return 'days-warning';
    return 'days-ok';
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'a_vencer': return 'A vencer';
      case 'cumprida': return 'Cumprida';
      case 'vencida': return 'Vencida';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  getCompanyName(companyId: string | undefined | null): string {
    if (!companyId) return '-';
    const c = this.companies.find(x => x.id === companyId);
    return (c && (c.razaoSocial || c.nomeFantasia || c.name)) || '-';
  }

  async markAsCumprida(cond: LicenseCondition): Promise<void> {
    try {
      await this.conditionsService.markAsCumprida(cond.id);
      await this.loadConditions();
      this.snack.open('Condicionante marcada como cumprida', 'OK', { duration: 3000 });
    } catch (e) {
      console.error('Erro ao atualizar condicionante', e);
      this.snack.open('Erro ao atualizar condicionante', 'OK', { duration: 3000 });
    }
  }

  openEvidence(cond: LicenseCondition): void {
    if (cond.evidenceUrl) {
      window.open(cond.evidenceUrl, '_blank');
    }
  }
}
