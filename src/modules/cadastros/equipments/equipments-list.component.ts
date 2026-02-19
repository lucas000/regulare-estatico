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
import { MatSelectModule } from '@angular/material/select';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { Equipment } from '../models/equipment.model';
import { EquipmentsService } from '../services/equipments.service';
import { EquipmentDialogComponent } from './equipment-dialog.component';

@Component({
  selector: 'app-equipments-list',
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
    MatSelectModule,
  ],
  templateUrl: './equipments-list.component.html',
  styleUrls: ['./equipments-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentsListComponent implements OnInit, OnDestroy {
  private readonly service = inject(EquipmentsService);
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly snack = inject(MatSnackBar);

  columns = ['name', 'type', 'hasCertification', 'certificationNumber', 'validUntil',  'status', 'acoes'];
  items: Equipment[] = [];
  dataSource = new MatTableDataSource<Equipment>([]);

  pageSize = 30;
  pageIndex = 0;
  cursors: any[] = [];
  total = 0;
  hasMore = true;
  private _reqId = 0;

  loading = false;

  searchControl = new FormControl('');
  typeControl = new FormControl('' as any);
  private subs = new Subscription();

  filterTerm = '';
  filterType: 'EPI' | 'EPC' | '' = '';

  @ViewChild(MatPaginator) paginator?: MatPaginator;

  ngOnInit(): void {
    this.subs.add(
      this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe((v) => {
        this.filterTerm = (v ?? '').toString();
        this.loadPage(0, true);
      })
    );

    // tipo: filtro apenas em tela
    this.subs.add(
      this.typeControl.valueChanges.subscribe((v) => {
        this.filterType = (v ?? '') as any;
        this.applyTypeFilterOnly();
      })
    );

    this.loadPage(0, true);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private applyTypeFilterOnly() {
    const filtered = this.filterType ? this.items.filter((x) => x.type === this.filterType) : this.items;
    this.dataSource.data = filtered;
    this.cd.markForCheck();
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
      const res: any = await this.service.listEquipmentsPaged(this.filterTerm, this.pageSize, startAfterDoc);
      if (reqId !== this._reqId) return;

      const serverDocs = (res.docs as Equipment[]) ?? [];
      this.items = serverDocs;
      this.cursors[index] = res.lastDoc;
      this.pageIndex = index;
      this.hasMore = serverDocs.length === this.pageSize;

      // aplica filtro de tipo somente em tela
      this.applyTypeFilterOnly();

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
      const res: any = await this.service.listEquipmentsPaged(this.filterTerm, this.pageSize, startAfter);
      this.cursors[i] = res.lastDoc;

      if (i === targetIndex) {
        const serverDocs = (res.docs as Equipment[]) ?? [];
        this.items = serverDocs;
        this.pageIndex = i;
        this.hasMore = serverDocs.length === this.pageSize;

        this.applyTypeFilterOnly();

        this.total = (this.pageIndex + (this.hasMore ? 2 : 1)) * this.pageSize;
        if (this.paginator) this.paginator.length = this.total;
        this.cd.markForCheck();
      }

      if (!Array.isArray(res.docs) || res.docs.length < this.pageSize) break;
    }
  }

  newEquipment() {
    const ref = this.dialog.open(EquipmentDialogComponent, { width: '600px', disableClose: true, hasBackdrop: true });
    ref.afterClosed().subscribe(async (res: any) => {
      if (!res) return;
      try {
        await this.service.createEquipment(res);
        this.snack.open('Equipamento criado com sucesso', 'Fechar', { duration: 3000 });
        this.loadPage(0, true);
      } catch (e: any) {
        this.snack.open(e?.message || 'Erro ao criar equipamento', 'Fechar', { duration: 4000 });
      }
    });
  }

  editEquipment(equip: Equipment) {
    const ref = this.dialog.open(EquipmentDialogComponent, { width: '600px', data: equip, disableClose: true, hasBackdrop: true });
    ref.afterClosed().subscribe(async (res: any) => {
      if (!res) return;
      try {
        await this.service.updateEquipment(equip.id, res);
        this.snack.open('Equipamento atualizado com sucesso', 'Fechar', { duration: 3000 });
        this.loadPage(0, true);
      } catch (e: any) {
        this.snack.open(e?.message || 'Erro ao atualizar equipamento', 'Fechar', { duration: 4000 });
      }
    });
  }

  toggleActive(equip: Equipment) {
    this.service
      .setActive(equip.id, equip.status !== 'ativo')
      .then(() => {
        const msg = equip.status !== 'ativo' ? 'Equipamento ativado com sucesso' : 'Equipamento inativado com sucesso';
        this.snack.open(msg, 'Fechar', { duration: 3000 });
        this.loadPage(0, true);
      })
      .catch((e: any) => {
        this.snack.open(e?.message || 'Erro ao alterar status', 'Fechar', { duration: 4000 });
      });
  }

  hasCertLabel(v: any): string {
    return v ? 'Sim' : 'Não';
  }
}
