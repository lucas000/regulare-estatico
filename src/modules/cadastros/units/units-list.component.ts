import { ChangeDetectionStrategy, Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UnitsService } from '../services/units.service';
import { Unit } from '../models/unit.model';
import { UnitDialogComponent } from './unit-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-units-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatDialogModule],
  templateUrl: './units-list.component.html',
  styleUrls: ['./units-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitsListComponent implements OnInit {
  private readonly unitsService = inject(UnitsService);
  private readonly dialog = inject(MatDialog);
  private readonly cd = inject(ChangeDetectorRef);

  columns = ['nome', 'cidade', 'estado', 'status', 'acoes'];
  units: Unit[] = [];
  dataSource: MatTableDataSource<Unit>;

  constructor() {
    this.dataSource = new MatTableDataSource<Unit>([]);
  }

  ngOnInit(): void {
    this.load();
  }

  async load() {
    this.units = await this.unitsService.listByEmpresa('');
    this.dataSource.data = this.units;
    this.cd.markForCheck();
  }

  newUnit() {
    const ref = this.dialog.open(UnitDialogComponent, { width: '600px' });
    ref.afterClosed().subscribe(async (res: any) => {
      if (!res) return;
      await this.unitsService.createUnit(res);
      this.load();
    });
  }

  editUnit(u: Unit) {
    const ref = this.dialog.open(UnitDialogComponent, { width: '600px', data: u });
    ref.afterClosed().subscribe(async (res: any) => {
      if (!res) return;
      await this.unitsService.updateUnit(u.id, res);
      this.load();
    });
  }

  toggleActive(u: Unit) {
    this.unitsService.setActive(u.id, u.status !== 'ativo').then(() => this.load());
  }
}
