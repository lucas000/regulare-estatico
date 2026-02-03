import { ChangeDetectionStrategy, Component, inject, OnInit, ChangeDetectorRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Cargo } from '../models/cargo.model';
import { CargosService } from '../services/cargos.service';
import { CboImportService } from '../services/cbo-import.service';
import { CargoDialogComponent } from './cargo-dialog.component';

@Component({
  selector: 'app-cargos-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatProgressBarModule, FormsModule, ReactiveFormsModule, MatPaginatorModule, MatSnackBarModule],
  templateUrl: './cargos-list.component.html',
  styleUrls: ['./cargos-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CargosListComponent implements OnInit, OnDestroy {
  private readonly cargosService = inject(CargosService);
  private readonly cboImport = inject(CboImportService);
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly snack = inject(MatSnackBar);

  columns = ['name', 'cbo', 'status', 'acoes'];
  cargos: Cargo[] = [];
  dataSource: MatTableDataSource<Cargo>;

  pageSize = 30;
  pageIndex = 0;
  cursors: any[] = [];
  total = 0;
  hasMore = true;
  private _reqId = 0;
  filterTerm = '';

  loading = false;
  importing = false;

  searchControl = new FormControl('');
  private subs: Subscription | null = null;

  constructor() { this.dataSource = new MatTableDataSource<Cargo>([]); }

  @ViewChild(MatPaginator) paginator?: MatPaginator;

  ngOnInit(): void {
    this.subs = this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe((v: string | null) => {
      this.filterTerm = v ?? '';
      this.loadPage(0, true);
    });
    this.loadPage(0, true);
  }

  ngOnDestroy(): void { this.subs?.unsubscribe(); }

  async loadPage(index = 0, reset = false) {
    if (reset) { this.pageIndex = index; this.cursors = []; this.hasMore = true; }
    this.loading = true;
    const reqId = ++this._reqId;
    try {
      const startAfterDoc = index > 0 ? this.cursors[index - 1] : undefined;
      const res: any = await this.cargosService.listCargosPaged(this.filterTerm, this.pageSize, startAfterDoc);
      if (reqId !== this._reqId) return;
      this.cargos = res.docs as Cargo[];
      this.dataSource.data = this.cargos;
      this.cursors[index] = res.lastDoc;
      this.pageIndex = index;
      this.hasMore = Array.isArray(res.docs) && res.docs.length === this.pageSize;
      this.total = (this.pageIndex + (this.hasMore ? 2 : 1)) * this.pageSize;
      if (this.paginator) { this.paginator.pageIndex = this.pageIndex; this.paginator.length = this.total; }
    } finally {
      if (reqId === this._reqId) { this.loading = false; this.cd.markForCheck(); }
    }
  }

  async load(reset = false) { await this.loadPage(reset ? 0 : this.pageIndex, reset); }

  search() { this.filterTerm = this.searchControl.value ?? ''; this.loadPage(0, true); }

  async onPage(event: PageEvent) {
    const targetIndex = event.pageIndex; const targetSize = event.pageSize; this.pageSize = targetSize;
    if (targetIndex === this.pageIndex) return; if (targetIndex < this.pageIndex) { await this.loadPage(targetIndex); return; }
    for (let i = this.pageIndex + 1; i <= targetIndex; i++) {
      const startAfter = i > 0 ? this.cursors[i - 1] : undefined;
      const res: any = await this.cargosService.listCargosPaged(this.filterTerm, this.pageSize, startAfter);
      this.cursors[i] = res.lastDoc;
      if (i === targetIndex) {
        this.cargos = res.docs as Cargo[]; this.dataSource.data = this.cargos; this.pageIndex = i; this.hasMore = Array.isArray(res.docs) && res.docs.length === this.pageSize; this.total = (this.pageIndex + (this.hasMore ? 2 : 1)) * this.pageSize; if (this.paginator) this.paginator.length = this.total; this.cd.markForCheck();
      }
      if (!Array.isArray(res.docs) || res.docs.length < this.pageSize) break;
    }
  }

  newCargo() { const ref = this.dialog.open(CargoDialogComponent, { width: '600px' }); ref.afterClosed().subscribe(async (res: any) => { if (!res) return; try { await this.cargosService.createCargo(res); this.snack.open('Cargo criado com sucesso', 'Fechar', { duration: 3000 }); this.loadPage(0, true); } catch (e: any) { this.snack.open(e?.message ?? 'Erro ao criar cargo', 'Fechar', { duration: 4000 }); } }); }

  editCargo(c: Cargo) { const ref = this.dialog.open(CargoDialogComponent, { width: '600px', data: c }); ref.afterClosed().subscribe(async (res: any) => { if (!res) return; try { await this.cargosService.updateCargo(c.id, res); this.snack.open('Cargo atualizado com sucesso', 'Fechar', { duration: 3000 }); this.loadPage(0, true); } catch (e: any) { this.snack.open(e?.message ?? 'Erro ao atualizar cargo', 'Fechar', { duration: 4000 }); } }); }

  toggleActive(c: Cargo) { this.cargosService.setActive(c.id, c.status !== 'ativo').then(() => { const msg = c.status !== 'ativo' ? 'Cargo ativado com sucesso' : 'Cargo inativado com sucesso'; this.snack.open(msg, 'Fechar', { duration: 3000 }); this.loadPage(0, true); }); }

  async handleFile(file?: File) {
    if (!file) return;
    this.importing = true;
    this.cd.markForCheck();
    try {
      const res = await this.cboImport.importFromFile(file);
      this.snack.open(`Importação concluída com sucesso. Importados: ${res.imported}. Ignorados: ${res.skipped}. Erros: ${res.errors}`, 'Fechar', { duration: 6000 });
      this.loadPage(0, true);
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Erro na importação', 'Fechar', { duration: 6000 });
    } finally {
      this.importing = false;
      this.cd.markForCheck();
    }
  }
}
