import { ChangeDetectionStrategy, Component, inject, OnInit, ChangeDetectorRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EmployeeDialogComponent } from './employee-dialog.component';
import { EmployeesService } from '../services/employees.service';
import { Employee } from '../models/employee.model';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { MatPaginator, PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CompaniesRepository } from '../repositories/companies.repository';
import { UnitsRepository } from '../repositories/units.repository';
import { SessionService } from '../../../core/services/session.service';
import { SectorsRepository } from '../repositories/sectors.repository';

@Component({
  selector: 'app-employees-list',
  standalone: true,
    imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatProgressBarModule, FormsModule, ReactiveFormsModule, MatPaginatorModule, MatSnackBarModule],
  templateUrl: './employees-list.component.html',
  styleUrls: ['./employees-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeesListComponent implements OnInit, OnDestroy {
  private readonly employeesService = inject(EmployeesService);
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly companiesRepo = inject(CompaniesRepository);
  private readonly unitsRepo = inject(UnitsRepository);
  private readonly snack = inject(MatSnackBar);
  private readonly session = inject(SessionService);
  private readonly sectorsRepo = inject(SectorsRepository);

  columns = ['name', 'companyName', 'unitName', 'sectorName', 'esocialCategory', 'cargo', 'status', 'acoes'];
  employees: Employee[] = [];
  dataSource: MatTableDataSource<Employee>;

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

  companies: any[] = [];
  units: any[] = [];

  @ViewChild(MatPaginator) paginator?: MatPaginator;

  constructor() {
    this.dataSource = new MatTableDataSource<Employee>([]);
  }

  get canEdit(): boolean { return this.session.hasRole(['ADMIN', 'CLIENTE'] as any); }

  private companiesMap = new Map<string, string>();
  private unitsMap = new Map<string, string>();
  private sectorsMap = new Map<string, string>();

  companyNameById(id: string): string {
    if (!id) return '';
    if (this.companiesMap.has(id)) return this.companiesMap.get(id)!;
    const hit = this.companies.find(c => c.id === id);
    if (hit) { this.companiesMap.set(id, hit.name); return hit.name; }
    return '';
  }

  unitNameById(id: string): string {
    if (!id) return '';
    if (this.unitsMap.has(id)) return this.unitsMap.get(id)!;
    // try from currently loaded units
    const hit = this.units.find(u => u.id === id);
    if (hit) { this.unitsMap.set(id, hit.name); return hit.name; }
    // lazy load single unit and cache (fire and forget)
    this.unitsRepo.getById(id).then(u => { if (u) { this.unitsMap.set(id, (u as any).name); this.cd.markForCheck(); } });
    return '';
  }

  sectorNameById(id: string): string {
    if (!id) return '';
    if (this.sectorsMap.has(id)) return this.sectorsMap.get(id)!;
    // lazy load and cache
    this.sectorsRepo.getById(id).then((s) => {
      if (s) {
        this.sectorsMap.set(id, (s as any).name ?? '');
        this.cd.markForCheck();
      }
    });
    return '';
  }

  async ngOnInit() {
    this.subs = this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe((v: string | null) => {
      this.filterTerm = v ?? '';
      this.loadPage(0, true);
    });

    // Load companies for mapping names; units are lazy-loaded per id
    this.companies = await this.companiesRepo.listAll(500);

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

      // If there is a search term, run aggregated search (non-paged)
      if (this.filterTerm && this.filterTerm.trim().length) {
        const resAgg = await this.employeesService.searchAggregated(this.filterTerm);
        if (reqId !== this._reqId) return;
        this.employees = resAgg as Employee[];
        this.dataSource.data = this.employees;
        this.pageIndex = 0;
        this.hasMore = false;
        this.total = this.employees.length;
        if (this.paginator) { this.paginator.pageIndex = this.pageIndex; this.paginator.length = this.total; }
        return;
      }

      const res: any = await this.employeesService.listEmployeesPaged(this.filterTerm, this.pageSize, startAfterDoc);
      if (reqId !== this._reqId) return;
      this.employees = res.docs as Employee[];
      this.dataSource.data = this.employees;
      this.cursors[index] = res.lastDoc;
      this.pageIndex = index;
      this.hasMore = Array.isArray(res.docs) && res.docs.length === this.pageSize;

      this.total = (this.pageIndex + (this.hasMore ? 2 : 1)) * this.pageSize;
      if (this.paginator) { this.paginator.pageIndex = this.pageIndex; this.paginator.length = this.total; }
    } finally {
      if (reqId === this._reqId) {
        this.loading = false;
        this.cd.markForCheck();
      }
    }
  }

  async onPage(event: PageEvent) {
    const targetIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    if (targetIndex === this.pageIndex) return;

    if (targetIndex < this.pageIndex) { await this.loadPage(targetIndex); return; }

    for (let i = this.pageIndex + 1; i <= targetIndex; i++) {
      const startAfter = i > 0 ? this.cursors[i - 1] : undefined;
      const res: any = await this.employeesService.listEmployeesPaged(this.filterTerm, this.pageSize, startAfter);
      this.cursors[i] = res.lastDoc;
      if (i === targetIndex) {
        this.employees = res.docs as Employee[];
        this.dataSource.data = this.employees;
        this.pageIndex = i;
        this.hasMore = Array.isArray(res.docs) && res.docs.length === this.pageSize;
        this.total = (this.pageIndex + (this.hasMore ? 2 : 1)) * this.pageSize;
        if (this.paginator) this.paginator.length = this.total;
        this.cd.markForCheck();
      }
      if (!Array.isArray(res.docs) || res.docs.length < this.pageSize) break;
    }
  }

  newEmployee() {
    const ref = this.dialog.open(EmployeeDialogComponent, { width: '700px' });
    ref.afterClosed().subscribe(async (res: any) => {
      if (!res) return;
      await this.employeesService.createEmployee(res);
      this.snack.open('Funcionário cadastrado com sucesso', 'Fechar', { duration: 3000 });
      this.loadPage(0, true);
    });
  }

  editEmployee(e: Employee) {
    const ref = this.dialog.open(EmployeeDialogComponent, { width: '700px', data: e });
    ref.afterClosed().subscribe(async (res: any) => {
      if (!res) return;
      await this.employeesService.updateEmployee(e.id, res);
      this.snack.open('Funcionário atualizado com sucesso', 'Fechar', { duration: 3000 });
      this.loadPage(0, true);
    });
  }

  toggleActive(e: Employee) {
    this.employeesService.setActive(e.id, e.status !== 'ativo').then(() => {
      const msg = e.status !== 'ativo' ? 'Funcionário ativado com sucesso' : 'Funcionário inativado com sucesso';
      this.snack.open(msg, 'Fechar', { duration: 3000 });
      this.loadPage(0, true);
    });
  }

  formatCargo(name: string, cbo: string | number): string {
    let cboStr = (cbo ?? '').toString().replace(/\D/g, '');
    let formattedCbo = cboStr;
    if (cboStr.length > 2) {
      formattedCbo = cboStr.slice(0, -2) + '-' + cboStr.slice(-2);
    }
    // Se não houver nome ou cbo, retorna o que existir
    if (!name && !formattedCbo) return '';
    if (!name) return formattedCbo;
    if (!formattedCbo) return name;
    return `${name} -  CBO (${formattedCbo})`;
  }

  // Backwards-compatible public API used by parent container
  async load(reset = false) {
    await this.loadPage(reset ? 0 : this.pageIndex, reset);
  }
}
