import { ChangeDetectionStrategy, Component, inject, OnInit, ChangeDetectorRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UnitsService } from '../services/units.service';
import { Unit } from '../models/unit.model';
import { UnitDialogComponent } from './unit-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { MatPaginator, PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-units-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatProgressBarModule, FormsModule, ReactiveFormsModule, MatPaginatorModule, MatSnackBarModule],
  templateUrl: './units-list.component.html',
  styleUrls: ['./units-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitsListComponent implements OnInit, OnDestroy {
  private readonly unitsService = inject(UnitsService);
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly snack = inject(MatSnackBar);

  columns = ['name', 'document', 'cnaeMain', 'cityUf', 'status', 'acoes'];

  cnaeDisplay(c: any): string {
    if (!c) return '';
    if (typeof c === 'string') return c; // legacy
    const id = String(c?.id ?? '').trim();
    const desc = String(c?.descricao ?? '').trim();
    if (!id && !desc) return '';
    return id && desc ? `${desc} (${id})` : (desc || id);
  }
  units: Unit[] = [];
  dataSource: MatTableDataSource<Unit>;

  pageSize = 30;
  pageIndex = 0;
  cursors: any[] = [];
  total = 0;
  hasMore = true;
  private _reqId = 0;
  filterTerm = '';

  loading = false;
  searchControl = new FormControl('');
  private subs: Subscription | null = null;

  @ViewChild(MatPaginator) paginator?: MatPaginator;

  constructor() {
    this.dataSource = new MatTableDataSource<Unit>([]);
  }

  ngOnInit(): void {
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
      const res: any = await this.unitsService.listUnitsPaged(this.filterTerm, this.pageSize, startAfterDoc);

      if (reqId !== this._reqId) return;

      this.units = res.docs as Unit[];
      this.dataSource.data = this.units;
      this.cursors[index] = res.lastDoc;
      this.pageIndex = index;
      this.hasMore = Array.isArray(res.docs) && res.docs.length === this.pageSize;

      this.total = (this.pageIndex + (this.hasMore ? 2 : 1)) * this.pageSize;
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

  // Backwards-compatible public API for container
  async load(reset = false) { await this.loadPage(reset ? 0 : this.pageIndex, reset); }

  search() { this.filterTerm = this.searchControl.value ?? ''; this.loadPage(0, true); }

  async onPage(event: PageEvent) {
    const targetIndex = event.pageIndex;
    const targetSize = event.pageSize;
    this.pageSize = targetSize;

    if (targetIndex === this.pageIndex) return;

    if (targetIndex < this.pageIndex) {
      await this.loadPage(targetIndex);
      return;
    }

    for (let i = this.pageIndex + 1; i <= targetIndex; i++) {
      const startAfter = i > 0 ? this.cursors[i - 1] : undefined;
      const res: any = await this.unitsService.listUnitsPaged(this.filterTerm, this.pageSize, startAfter);
      this.cursors[i] = res.lastDoc;

      if (i === targetIndex) {
        this.units = res.docs as Unit[];
        this.dataSource.data = this.units;
        this.pageIndex = i;
        this.hasMore = Array.isArray(res.docs) && res.docs.length === this.pageSize;
        this.total = (this.pageIndex + (this.hasMore ? 2 : 1)) * this.pageSize;
        if (this.paginator) this.paginator.length = this.total;
        this.cd.markForCheck();
      }

      if (!Array.isArray(res.docs) || res.docs.length < this.pageSize) break;
    }
  }

  nextPage() { if (!this.hasMore) return; this.paginator?.nextPage(); }
  prevPage() { if (this.paginator && this.paginator.pageIndex > 0) this.paginator.previousPage(); }

  newUnit() { const ref = this.dialog.open(UnitDialogComponent, { width: '600px' }); ref.afterClosed().subscribe(async (res: any) => { if (!res) return; await this.unitsService.createUnit(res); this.snack.open('Unidade criada com sucesso', 'Fechar', { duration: 3000 }); this.loadPage(0, true); }); }
  editUnit(u: Unit) { const ref = this.dialog.open(UnitDialogComponent, { width: '600px', data: u }); ref.afterClosed().subscribe(async (res: any) => { if (!res) return; await this.unitsService.updateUnit(u.id, res); this.snack.open('Unidade atualizada com sucesso', 'Fechar', { duration: 3000 }); this.loadPage(0, true); }); }
  toggleActive(u: Unit) {
    const willActivate = u.status !== 'active';
    this.unitsService.setActive(u.id, willActivate).then(() => {
      const msg = willActivate ? 'Unidade ativada com sucesso' : 'Unidade inativada com sucesso';
      this.snack.open(msg, 'Fechar', { duration: 3000 });
      this.loadPage(0, true);
    });
  }

  formatDocument(u: Unit): string {
    const type = (u as any).documentType ?? '';
    const num = (u as any).documentNumber ?? '';
    return [type, num].filter(Boolean).join(' - ');
  }

  getCity(u: Unit): string {
    return (u as any).address?.city ?? u.city ?? '';
  }

  getState(u: Unit): string {
    return (u as any).address?.state ?? u.state ?? '';
  }

  getCityUf(u: Unit): string {
    const c = this.getCity(u);
    const s = this.getState(u);
    return [c, s].filter(Boolean).join(' / ');
  }
}
