import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { Risk } from '../models/risk.model';
import { RisksService } from '../services/risks.service';
import { RiskDialogComponent } from './risk-dialog.component';

@Component({
  selector: 'app-risks-list',
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
  templateUrl: './risks-list.component.html',
  styleUrls: ['./risks-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RisksListComponent implements OnInit, OnDestroy {
  private readonly risksService = inject(RisksService);
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly snack = inject(MatSnackBar);

  columns = ['name', 'riskGroup', 'evaluationType', 'esocialCode', 'status', 'acoes'];
  risks: Risk[] = [];
  dataSource = new MatTableDataSource<Risk>([]);

  // Pagination / filter
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
      const res: any = await this.risksService.listRisksPaged(this.filterTerm, this.pageSize, startAfterDoc);
      if (reqId !== this._reqId) return;

      this.risks = (res.docs as Risk[]) ?? [];
      this.dataSource.data = this.risks;
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

  async load(reset = false) {
    await this.loadPage(reset ? 0 : this.pageIndex, reset);
  }

  search() {
    this.filterTerm = this.searchControl.value ?? '';
    this.loadPage(0, true);
  }

  async onPage(event: PageEvent) {
    const targetIndex = event.pageIndex;
    this.pageSize = event.pageSize;

    if (targetIndex === this.pageIndex) return;

    if (targetIndex < this.pageIndex) {
      await this.loadPage(targetIndex);
      return;
    }

    for (let i = this.pageIndex + 1; i <= targetIndex; i++) {
      const startAfter = i > 0 ? this.cursors[i - 1] : undefined;
      const res: any = await this.risksService.listRisksPaged(this.filterTerm, this.pageSize, startAfter);
      this.cursors[i] = res.lastDoc;

      if (i === targetIndex) {
        this.risks = (res.docs as Risk[]) ?? [];
        this.dataSource.data = this.risks;
        this.pageIndex = i;
        this.hasMore = Array.isArray(res.docs) && res.docs.length === this.pageSize;
        this.total = (this.pageIndex + (this.hasMore ? 2 : 1)) * this.pageSize;
        if (this.paginator) this.paginator.length = this.total;
        this.cd.markForCheck();
      }

      if (!Array.isArray(res.docs) || res.docs.length < this.pageSize) break;
    }
  }

  newRisk() {
    const ref = this.dialog.open(RiskDialogComponent, { width: '600px' });
    ref.afterClosed().subscribe(async (res: any) => {
      if (!res) return;
      await this.risksService.createRisk(res);
      this.snack.open('Risco criado com sucesso', 'Fechar', { duration: 3000 });
      this.loadPage(0, true);
    });
  }

  editRisk(r: Risk) {
    const ref = this.dialog.open(RiskDialogComponent, { width: '600px', data: r });
    ref.afterClosed().subscribe(async (res: any) => {
      if (!res) return;
      await this.risksService.updateRisk(r.id, res);
      this.snack.open('Risco atualizado com sucesso', 'Fechar', { duration: 3000 });
      this.loadPage(0, true);
    });
  }

  toggleActive(r: Risk) {
    this.risksService.setActive(r.id, r.status !== 'ativo').then(() => {
      const msg = r.status !== 'ativo' ? 'Risco ativado com sucesso' : 'Risco inativado com sucesso';
      this.snack.open(msg, 'Fechar', { duration: 3000 });
      this.loadPage(0, true);
    });
  }

  groupLabel(g: any): string {
    const v = String(g ?? '').toLowerCase();
    const map: Record<string, string> = {
      fisico: 'Físico',
      quimico: 'Químico',
      biologico: 'Biológico',
      ergonomico: 'Ergonômico',
      acidente: 'Acidente',
      psicossocial: 'Psicossocial',
    };
    return map[v] ?? v;
  }

  evaluationLabel(t: any): string {
    return t === 'quantitativa' ? 'Quantitativa' : 'Qualitativa';
  }
}
