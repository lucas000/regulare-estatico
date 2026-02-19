import { ChangeDetectionStrategy, Component, inject, OnInit, ChangeDetectorRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { SectorDialogComponent } from './sector-dialog.component';
import { SectorsService } from '../services/sectors.service';
import { Sector } from '../models/sector.model';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { MatPaginator, PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {UnitsRepository} from "../repositories/units.repository";

@Component({
  selector: 'app-sectors-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    FormsModule,
    ReactiveFormsModule,
    MatPaginatorModule,
    MatSnackBarModule,
  ],
  templateUrl: './sectors-list.component.html',
  styleUrls: ['./sectors-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectorsListComponent implements OnInit, OnDestroy {
  private readonly sectorsService = inject(SectorsService);
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly snack = inject(MatSnackBar);
  private readonly unitsRepo = inject(UnitsRepository);
  columns = ['name', 'unit', 'estimatedWorkers', 'status', 'actions'];
  sectors: Sector[] = [];
  dataSource: MatTableDataSource<Sector>;

  pageSize = 30;
  pageIndex = 0;
  cursors: any[] = [];
  total = 0;
  hasMore = true;
  filterTerm = '';
  loading = false;
  searchControl = new FormControl('');
  private subs: Subscription | null = null;

  units: any[] = [];

  /** mapa unitId -> unitName para exibição na tabela */
  private unitNameById = new Map<string, string>();

  constructor() {
    this.dataSource = new MatTableDataSource<Sector>([]);
  }

  @ViewChild(MatPaginator) paginator?: MatPaginator;

  private assertService() {
    const svc: any = this.sectorsService as any;
    if (!svc || typeof svc.createSector !== 'function') {
      console.error('SectorsService inválido/incompleto no runtime:', svc);
      throw new Error('Serviço de Setores não inicializado corretamente.');
    }
  }

  ngOnInit(): void {
    this.assertService();

    this.subs = new Subscription();
    this.subs.add(
      this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe((v: string | null) => {
        this.filterTerm = v ?? '';
        this.loadPage(0, true);
      })
    );

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
    try {
      const startAfter = index > 0 ? this.cursors[index - 1] : undefined;
      const res: any = await this.sectorsService.listSectorsPaged(this.filterTerm, this.pageSize, startAfter);

      this.sectors = (res.docs as Sector[]) ?? [];
      this.dataSource.data = this.sectors;
      this.cursors[index] = res.lastDoc;
      this.pageIndex = index;
      this.hasMore = Array.isArray(res.docs) && res.docs.length === this.pageSize;
      this.total = (this.pageIndex + (this.hasMore ? 2 : 1)) * this.pageSize;
      if (this.paginator) {
        this.paginator.pageIndex = this.pageIndex;
        this.paginator.length = this.total;
      }
    } finally {
      this.loading = false;
      this.cd.markForCheck();
    }
  }

  search() {
    this.filterTerm = this.searchControl.value ?? '';
    this.loadPage(0, true);
  }

  newSector() {
    this.assertService();
    const ref = this.dialog.open(SectorDialogComponent, { width: '600px', disableClose: true, hasBackdrop: true });
    ref.afterClosed().subscribe(async (res: any) => {
      if (!res) return;
      await this.sectorsService.createSector(res);
      this.snack.open('Setor criado com sucesso', 'Fechar', { duration: 3000 });
      this.loadPage(0, true);
    });
  }
  private unitsMap = new Map<string, string>();

  getUnitName(id: string): string {
      if (!id) return '';
      if (this.unitsMap.has(id)) return this.unitsMap.get(id)!;
      // try from currently loaded units
      const hit = this.units.find(u => u.id === id);
      if (hit) { this.unitsMap.set(id, hit.name); return hit.name; }
      // lazy load single unit and cache (fire and forget)
      this.unitsRepo.getById(id).then(u => { if (u) { this.unitsMap.set(id, (u as any).name); this.cd.markForCheck(); } });
      return '';
  }

  // Backwards-compatible public API for container
  async load(reset = false) {
    await this.loadPage(reset ? 0 : this.pageIndex, reset);
  }

  async onPage(event: PageEvent) {
    const targetIndex = event.pageIndex;
    this.pageSize = event.pageSize;

    if (targetIndex === this.pageIndex) return;

    await this.loadPage(targetIndex);
  }

  editSector(s: Sector) {
    this.assertService();
    const ref = this.dialog.open(SectorDialogComponent, { width: '600px', data: s, disableClose: true, hasBackdrop: true });
    ref.afterClosed().subscribe(async (res: any) => {
      if (!res) return;
      await this.sectorsService.updateSector(s.id, res);
      this.snack.open('Setor atualizado com sucesso', 'Fechar', { duration: 3000 });
      this.loadPage(0, true);
    });
  }

  toggleActive(s: Sector) {
    this.assertService();
    this.sectorsService.setActive(s.id, s.status !== 'active').then(() => {
      const msg = s.status !== 'active' ? 'Setor ativado com sucesso' : 'Setor inativado com sucesso';
      this.snack.open(msg, 'Fechar', { duration: 3000 });
      this.loadPage(0, true);
    });
  }
}
