import { ChangeDetectionStrategy, Component, inject, OnInit, ChangeDetectorRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatTableDataSource, MatTableModule} from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { CompanyDialogComponent } from './company-dialog.component';
import { CompaniesService } from '../services/companies.service';
import { Company } from '../models/company.model';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { CompaniesRepository } from '../repositories/companies.repository';
import { UnitsRepository } from '../repositories/units.repository';
import { SessionService } from '../../../core/services/session.service';
import { UsersRepository } from '../../../core/services/users.repository';
import { MatPaginator, PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-companies-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatProgressBarModule, FormsModule, ReactiveFormsModule, MatPaginatorModule, MatSnackBarModule],
  templateUrl: './companies-list.component.html',
  styleUrls: ['./companies-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompaniesListComponent implements OnInit, OnDestroy {
  private readonly companiesService = inject(CompaniesService);
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly companiesRepo = inject(CompaniesRepository);
  private readonly unitsRepo = inject(UnitsRepository);
  private readonly session = inject(SessionService);
  private readonly usersRepo = inject(UsersRepository);
  private readonly snack = inject(MatSnackBar);

  columns = ['nome', 'cnpj', 'status', 'acoes'];
  companies: Company[] = [];
  dataSource: MatTableDataSource<Company>;

  // Pagination / filter
  pageSize = 30;
  pageIndex = 0; // zero-based
  cursors: any[] = []; // store DocumentSnapshots (last doc per page)
  total = 0; // approximate total for paginator
  hasMore = true;
  private _reqId = 0;
  filterTerm = '';

  loading = false;

  searchControl = new FormControl('');
  private subs: Subscription | null = null;

  generatingTestData = false;

  constructor() {
    this.dataSource = new MatTableDataSource<Company>([]);
  }

  @ViewChild(MatPaginator) paginator?: MatPaginator;

  ngOnInit(): void {
    // wire debounce search
    this.subs = this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe((v: string | null) => {
      this.filterTerm = v ?? '';
      this.loadPage(0, true);
    });

    this.loadPage(0, true);
  }

  ngOnDestroy(): void {
    this.subs?.unsubscribe();
  }

  async loadPage(index = 0, reset = false) {
    if (reset) {
      this.pageIndex = index;
      this.cursors = [];
      this.hasMore = true;
    }

    this.loading = true;
    const reqId = ++this._reqId;

    try {
      const startAfterDoc = index > 0 ? this.cursors[index - 1] : undefined;
      const res: any = await this.companiesService.listCompaniesPaged(this.filterTerm, this.pageSize, startAfterDoc);

      // ignore if a newer request was issued
      if (reqId !== this._reqId) return;

      this.companies = res.docs as Company[];
      this.dataSource.data = this.companies;
      this.cursors[index] = res.lastDoc;
      this.pageIndex = index;
      this.hasMore = Array.isArray(res.docs) && res.docs.length === this.pageSize;

      // approximate total so paginator disables next when no more pages
      this.total = (this.pageIndex + (this.hasMore ? 2 : 1)) * this.pageSize;
      // update paginator UI if present
      if (this.paginator) {
        this.paginator.pageIndex = this.pageIndex;
        this.paginator.length = this.total;
      }
    } finally {
      if (reqId === this._reqId) {
        this.loading = false;
        this.cd.markForCheck();
      }
    }
  }

  // Backwards-compatible public API used by parent container (CadastrosComponent)
  async load(reset = false) {
    await this.loadPage(reset ? 0 : this.pageIndex, reset);
  }

  search() {
    // reset pagination and load (manual button)
    this.filterTerm = this.searchControl.value ?? '';
    this.loadPage(0, true);
  }

  async onPage(event: PageEvent) {
    const targetIndex = event.pageIndex;
    const targetSize = event.pageSize;
    this.pageSize = targetSize;

    if (targetIndex === this.pageIndex) return;

    if (targetIndex < this.pageIndex) {
      // going back: we should have cursor for previous pages
      await this.loadPage(targetIndex);
      return;
    }

    // going forward: if we don't have cursors for intermediate pages, fetch sequentially
    for (let i = this.pageIndex + 1; i <= targetIndex; i++) {
      const startAfter = i > 0 ? this.cursors[i - 1] : undefined;
      const res: any = await this.companiesService.listCompaniesPaged(this.filterTerm, this.pageSize, startAfter);
      this.cursors[i] = res.lastDoc;

      if (i === targetIndex) {
        this.companies = res.docs as Company[];
        this.dataSource.data = this.companies;
        this.pageIndex = i;
        this.hasMore = Array.isArray(res.docs) && res.docs.length === this.pageSize;
        this.total = (this.pageIndex + (this.hasMore ? 2 : 1)) * this.pageSize;
        if (this.paginator) this.paginator.length = this.total;
        this.cd.markForCheck();
      }

      if (!Array.isArray(res.docs) || res.docs.length < this.pageSize) {
        // no more pages, break
        break;
      }
    }
  }

  newCompany() {
    const ref = this.dialog.open(CompanyDialogComponent, { width: '600px' });
    ref.afterClosed().subscribe(async (res: any) => {
      if (!res) return;
      await this.companiesService.createCompanyWithClientUser(res);
      this.snack.open('Empresa criada com sucesso', 'Fechar', { duration: 3000 });
      this.loadPage(0, true);
    });
  }

  editCompany(c: Company) {
    const ref = this.dialog.open(CompanyDialogComponent, { width: '600px', data: c });
    ref.afterClosed().subscribe(async (res: any) => {
      if (!res) return;
      await this.companiesService.updateCompany(c.id, res);
      this.snack.open('Empresa atualizada com sucesso', 'Fechar', { duration: 3000 });
      this.loadPage(0, true);
    });
  }

  toggleActive(c: Company) {
    this.companiesService.setActive(c.id, c.status !== 'ativo').then(() => {
      const msg = c.status !== 'ativo' ? 'Empresa ativada com sucesso' : 'Empresa inativada com sucesso';
      this.snack.open(msg, 'Fechar', { duration: 3000 });
      this.loadPage(0, true);
    });
  }

  private sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }

  async generateTestData() {
    if (this.generatingTestData) return;
    this.generatingTestData = true;
    this.cd.markForCheck();
    try {
      // build audit from current session user
      const sessUser = (this.session as any).user?.();
      const loggedUid = sessUser?.id ?? 'system';
      const loggedUserDoc = await this.usersRepo.get(loggedUid);
      const criadoPor = { uid: loggedUid, nome: loggedUserDoc?.name ?? 'Sistema', email: loggedUserDoc?.email ?? 'system@local' };

      const now = new Date().toISOString();

      // Detect existing test companies and units to make the generator resumable
      const existingCompanies: any[] = await this.companiesRepo.listAll(1000);
      const testCompanies = existingCompanies.filter(c => typeof c.id === 'string' && /^comp_\d{3}$/.test(c.id) && typeof c.nome === 'string' && c.nome.startsWith('Empresa Teste'));
      const existingCompanyIndexes = testCompanies.map(c => parseInt(c.id.replace('comp_', ''), 10)).filter(n => !isNaN(n));
      const maxExistingCompanyIdx = existingCompanyIndexes.length ? Math.max(...existingCompanyIndexes) : 0;

      // Get existing units to determine global unit counter
      const existingUnits: any[] = await this.unitsRepo.listAll(5000);
      const unitIdNums = existingUnits.map(u => {
        if (!u.id || typeof u.id !== 'string') return 0;
        const m = u.id.match(/^unit_(\d{3,})$/);
        return m ? parseInt(m[1], 10) : 0;
      }).filter(n => n > 0);
      let unitCounter = unitIdNums.length ? Math.max(...unitIdNums) + 1 : 1;

      const startIdx = maxExistingCompanyIdx + 1;
      for (let i = startIdx; i <= 100; i++) {
        const idx = String(i).padStart(3, '0');
        const compId = `comp_${idx}`;

        // If company already exists, skip creation
        const exists = testCompanies.some(c => c.id === compId);
        if (!exists) {
          const company: any = {
            id: compId,
            nome: `Empresa Teste ${idx}`,
            email: `teste${idx}@example.com`,
            cnpj: `00.000.000/000${idx}`,
            status: 'ativo',
            criadoEm: now,
            atualizadoEm: now,
            criadoPor,
          };
          await this.companiesRepo.create(company);
        }

        // Ensure this company has 15 units; create missing ones
        const unitsForCompany: any[] = await this.unitsRepo.listBy('companyId' as any, compId, 1000);
        const existingCount = Array.isArray(unitsForCompany) ? unitsForCompany.length : 0;
        for (let u = existingCount + 1; u <= 15; u++) {
          const unitIdx = String(unitCounter).padStart(3, '0');
          const unitId = `unit_${unitIdx}`;
          const unit: any = {
            id: unitId,
            companyId: compId,
            nome: `Unidade ${String(u).padStart(2, '0')}`,
            cidade: 'Cidade Teste',
            estado: 'ST',
            status: 'ativo',
            criadoEm: now,
            atualizadoEm: now,
            criadoPor: criadoPor,
          };
          await this.unitsRepo.create(unit);
          unitCounter++;
          if (unitCounter % 50 === 0) await this.sleep(200);
        }

        // mark progress occasionally
        if (i % 10 === 0) {
          await this.loadPage(0, true);
          await this.sleep(100);
        }
      }

      // final reload
      await this.loadPage(0, true);
    } catch (e) {
      console.error('Erro gerando dados de teste', e);
      alert('Erro ao gerar dados de teste: ' + (e as any)?.message ?? e);
    } finally {
      this.generatingTestData = false;
      this.cd.markForCheck();
    }
  }
}
