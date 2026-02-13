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

import { LicensesService } from './services/licenses.service';
import { License, LICENSE_TYPES, daysUntilExpiration } from './models/license.model';
import { LicenseDialogComponent } from './components/license-dialog.component';
import { SessionService } from '../../core/services/session.service';
import { CompaniesRepository } from '../cadastros/repositories/companies.repository';
import { UnitsRepository } from '../cadastros/repositories/units.repository';
import { Company } from '../cadastros/models/company.model';
import { Unit } from '../cadastros/models/unit.model';

@Component({
  selector: 'app-licencas',
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
  templateUrl: './licencas.component.html',
  styleUrls: ['./licencas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LicencasComponent implements OnInit, OnDestroy {
  private readonly licensesService = inject(LicensesService);
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly snack = inject(MatSnackBar);
  private readonly session = inject(SessionService);
  private readonly companiesRepo = inject(CompaniesRepository);
  private readonly unitsRepo = inject(UnitsRepository);

  // Dados
  licenses: License[] = [];
  dataSource = new MatTableDataSource<License>([]);
  companies: Company[] = [];
  units: Unit[] = [];
  licenseTypes = LICENSE_TYPES;

  // Colunas
  columns = ['company', 'documentType', 'documentNumber', 'issuingAgency', 'issueDate', 'expirationDate', 'daysRemaining', 'status', 'acoes'];

  // Filtros
  companyFilter = new FormControl<string>('');
  unitFilter = new FormControl<string>('');
  typeFilter = new FormControl<string>('');
  statusFilter = new FormControl<string>('');
  searchControl = new FormControl<string>('');

  // Paginação
  pageSize = 30;
  pageIndex = 0;
  cursors: any[] = [];
  total = 0;
  hasMore = true;
  private _reqId = 0;

  loading = false;
  private subs = new Subscription();

  @ViewChild(MatPaginator) paginator?: MatPaginator;

  ngOnInit(): void {
    this.loadCompanies();
    this.setupFilters();
    this.loadPage(0, true);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private setupFilters(): void {
    // Debounce na busca textual
    this.subs.add(
      this.searchControl.valueChanges
        .pipe(debounceTime(300), distinctUntilChanged())
        .subscribe(() => this.loadPage(0, true))
    );

    // Filtros inteligentes - disparam busca ao alterar
    this.subs.add(
      this.companyFilter.valueChanges.subscribe(() => this.onCompanyChange())
    );
    this.subs.add(
      this.unitFilter.valueChanges.subscribe(() => this.loadPage(0, true))
    );
    this.subs.add(
      this.typeFilter.valueChanges.subscribe(() => this.loadPage(0, true))
    );
    this.subs.add(
      this.statusFilter.valueChanges.subscribe(() => this.loadPage(0, true))
    );
  }

  private async loadCompanies(): Promise<void> {
    try {
      const user = this.session.user();
      const isAdmin = this.session.hasRole(['ADMIN']);

      if (isAdmin) {
        // Admin: verifica escopo selecionado
        const scopeId = this.session.adminScopeCompanyId();
        if (scopeId) {
          const comp = await this.companiesRepo.getById(scopeId);
          this.companies = comp ? [comp] : [];
          this.companyFilter.setValue(scopeId);
        } else {
          this.companies = await this.companiesRepo.listAll(500);
        }
      } else if (user?.companyId) {
        // Cliente: apenas sua empresa
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

  async onCompanyChange(): Promise<void> {
    const companyId = this.companyFilter.value;
    this.unitFilter.setValue('');
    this.units = [];

    if (companyId) {
      try {
        this.units = await this.unitsRepo.listByCompany(companyId);
      } catch (e) {
        console.error('Erro ao carregar unidades', e);
      }
    }

    this.loadPage(0, true);
    this.cd.markForCheck();
  }

  applyFilters(): void {
    this.loadPage(0, true);
  }

  clearFilters(): void {
    const isAdmin = this.session.hasRole(['ADMIN']);
    const scopeId = this.session.adminScopeCompanyId();

    if (isAdmin && !scopeId) {
      this.companyFilter.setValue('');
    }
    this.unitFilter.setValue('');
    this.typeFilter.setValue('');
    this.statusFilter.setValue('');
    this.searchControl.setValue('');
    this.units = [];
    this.loadPage(0, true);
  }

  async loadPage(index = 0, reset = false): Promise<void> {
    if (reset) {
      this.pageIndex = index;
      this.cursors = [];
      this.hasMore = true;
    }

    this.loading = true;
    const reqId = ++this._reqId;

    try {
      const companyId = this.companyFilter.value || undefined;
      const unitId = this.unitFilter.value || undefined;
      const documentType = this.typeFilter.value || undefined;
      const status = this.statusFilter.value || undefined;
      const term = this.searchControl.value?.trim() || undefined;

      const startAfterDoc = index > 0 ? this.cursors[index - 1] : undefined;

      let res: { docs: License[]; lastDoc: any };

      if (term) {
        // Busca por número do documento
        res = await this.licensesService.listPaged(companyId, term, this.pageSize, startAfterDoc);
      } else {
        // Filtros combinados
        res = await this.licensesService.listPagedByFilters(
          { companyId, unitId, documentType, status },
          this.pageSize,
          startAfterDoc
        );
      }

      if (reqId !== this._reqId) return;

      this.licenses = res.docs;
      this.dataSource.data = this.licenses;
      this.cursors[index] = res.lastDoc;
      this.pageIndex = index;
      this.hasMore = res.docs.length === this.pageSize;

      this.total = (this.pageIndex + (this.hasMore ? 2 : 1)) * this.pageSize;
      if (this.paginator) {
        this.paginator.pageIndex = this.pageIndex;
        this.paginator.length = this.total;
      }
    } catch (e) {
      console.error('Erro ao carregar licenças', e);
      this.snack.open('Erro ao carregar licenças', 'OK', { duration: 3000 });
    } finally {
      if (reqId === this._reqId) {
        this.loading = false;
        this.cd.markForCheck();
      }
    }
  }

  onPage(event: PageEvent): void {
    const target = event.pageIndex;
    if (target > this.pageIndex) {
      if (this.hasMore) {
        this.loadPage(target);
      }
    } else if (target < this.pageIndex) {
      this.loadPage(target);
    }
  }

  // Helpers de exibição
  getDaysRemaining(license: License): string {
    const days = daysUntilExpiration(license.expirationDate);
    if (days < -9000) return '-';
    if (days < 0) return `${Math.abs(days)} dias vencida`;
    if (days === 0) return 'Vence hoje';
    return `${days} dias`;
  }

  getDaysClass(license: License): string {
    const days = daysUntilExpiration(license.expirationDate);
    if (days < 0) return 'days-danger';
    if (days <= 30) return 'days-warning';
    return 'days-ok';
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'em_dia': return 'Em dia';
      case 'a_vencer': return 'A vencer';
      case 'vencida': return 'Vencida';
      default: return status;
    }
  }

  getCompanyName(companyId: string | undefined | null): string {
    if (!companyId) return '-';
    const c = this.companies.find(x => x.id === companyId);
    return (c && (c.razaoSocial || c.nomeFantasia || c.name)) || '-';
  }

  // Ações
  newLicense(): void {
    const companyId = this.companyFilter.value || '';
    const dialogRef = this.dialog.open(LicenseDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: { companyId, companies: this.companies },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadPage(0, true);
        this.snack.open('Licença cadastrada com sucesso', 'OK', { duration: 3000 });
      }
    });
  }

  editLicense(license: License): void {
    const dialogRef = this.dialog.open(LicenseDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: { ...license, companies: this.companies, isEdit: true },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadPage(this.pageIndex);
        this.snack.open('Licença atualizada com sucesso', 'OK', { duration: 3000 });
      }
    });
  }

  viewLicense(license: License): void {
    // Abre em modo visualização (mesmo dialog, mas read-only)
    this.dialog.open(LicenseDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: { ...license, companies: this.companies, isEdit: true, readOnly: true },
    });
  }

  openPdf(license: License): void {
    if (license.pdfUrl) {
      window.open(license.pdfUrl, '_blank');
    }
  }
}
