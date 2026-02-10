import { ChangeDetectionStrategy, Component, inject, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule, MatTabGroup } from '@angular/material/tabs';
import { CompaniesListComponent } from './companies/companies-list.component';
import { UnitsListComponent } from './units/units-list.component';
import { CargosListComponent } from './cargos/cargos-list.component';
import { SectorsListComponent } from './sectors/sectors-list.component';
import { RisksListComponent } from './risks/risks-list.component';
import { EquipmentsListComponent } from './equipments/equipments-list.component';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-cadastros',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTabsModule,
    CompaniesListComponent,
    UnitsListComponent,
    CargosListComponent,
    SectorsListComponent,
    RisksListComponent,
    EquipmentsListComponent,
  ],
  template: `
    <mat-card class="card-full">
      <mat-tab-group mat-stretch-tabs (selectedIndexChange)="onTabChange($event)">
        <mat-tab *ngIf="canSee('EMPRESAS')" label="Empreendimentos (PF/PJ)">
          <app-companies-list></app-companies-list>
        </mat-tab>
        <mat-tab *ngIf="canSee('UNIDADES')" label="Unidades">
          <app-units-list></app-units-list>
        </mat-tab>
        <mat-tab *ngIf="canSee('FUNCIONARIOS')" label="Funcionários">
          <ng-container *ngIf="employeesCompPromise | async as employeesComp">
            <ng-container *ngComponentOutlet="employeesComp"></ng-container>
          </ng-container>
        </mat-tab>
        <mat-tab *ngIf="canSee('CARGOS')" label="Cargos">
          <app-cargos-list></app-cargos-list>
        </mat-tab>
        <mat-tab *ngIf="canSee('SETORES')" label="Setores">
          <app-sectors-list></app-sectors-list>
        </mat-tab>
        <mat-tab *ngIf="canSee('RISCOS')" label="Riscos">
          <app-risks-list></app-risks-list>
        </mat-tab>
        <mat-tab *ngIf="canSee('EPIS')" label="EPIs / EPCs">
          <app-equipments-list></app-equipments-list>
        </mat-tab>
      </mat-tab-group>
    </mat-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CadastrosComponent implements AfterViewInit {
  private readonly session = inject(SessionService);

  @ViewChild(MatTabGroup) tabGroup!: MatTabGroup;
  @ViewChild(CompaniesListComponent) companiesList?: CompaniesListComponent;
  @ViewChild(UnitsListComponent) unitsList?: UnitsListComponent;
  @ViewChild(CargosListComponent) cargosList?: CargosListComponent;
  @ViewChild(SectorsListComponent) sectorsList?: SectorsListComponent;
  @ViewChild(RisksListComponent) risksList?: RisksListComponent;
  @ViewChild(EquipmentsListComponent) equipmentsList?: EquipmentsListComponent;

  employeesCompPromise: Promise<any> | null = null;

  canSee(tab: 'EMPRESAS' | 'UNIDADES' | 'FUNCIONARIOS' | 'CARGOS' | 'SETORES' | 'RISCOS' | 'EPIS') {
    // Respect rules: CLIENTE cannot access module at all; ADMIN sees all; CONSULTOR sees all except empresas
    const isAdmin = this.session.hasRole(['ADMIN'] as any);
    const isConsultor = this.session.hasRole(['CONSULTOR'] as any);
    const isCliente = this.session.hasRole(['CLIENTE'] as any);
    if (isCliente) return false;
    if (tab === 'EMPRESAS') return isAdmin;
    // Funcionários: remove per-tab role restriction — available whenever the module is accessible (i.e., not CLIENTE)
    if (tab === 'FUNCIONARIOS') return true;
    return isAdmin || isConsultor;
  }

  ngAfterViewInit(): void {
    const tabsOrder: Array<'EMPRESAS' | 'UNIDADES' | 'FUNCIONARIOS' | 'CARGOS' | 'SETORES' | 'RISCOS' | 'EPIS'> = [
      'EMPRESAS',
      'UNIDADES',
      'FUNCIONARIOS',
      'CARGOS',
      'SETORES',
      'RISCOS',
      'EPIS',
    ];

    const visibleTabs = tabsOrder.filter(t => this.canSee(t));
    const defaultIndex = visibleTabs.indexOf('EMPRESAS') >= 0 ? visibleTabs.indexOf('EMPRESAS') : 0;

    // Set the selected tab index and trigger load for that tab
    if (this.tabGroup) {
      this.tabGroup.selectedIndex = defaultIndex;
      // pre-load employees component if default is FUNCIONARIOS
      const visibleTabsOrder = visibleTabs;
      if (visibleTabsOrder[defaultIndex] === 'FUNCIONARIOS') {
        this.employeesCompPromise = import('./funcionarios/employees-list.component').then(m => m.EmployeesListComponent);
      }
      // ensure initial tab's data is loaded
      this.onTabChange(defaultIndex);
    }
  }

  onTabChange(index: number): void {
    // Determine which visible tab is at the provided index and call its load method
    const tabsOrder: Array<'EMPRESAS' | 'UNIDADES' | 'FUNCIONARIOS' | 'CARGOS' | 'SETORES' | 'RISCOS' | 'EPIS'> = [
      'EMPRESAS', 'UNIDADES', 'FUNCIONARIOS', 'CARGOS', 'SETORES', 'RISCOS', 'EPIS'
    ];
    const visibleTabs = tabsOrder.filter(t => this.canSee(t));
    const tab = visibleTabs[index];
    if (!tab) return;

    if (tab === 'EMPRESAS') {
      this.companiesList?.load();
    } else if (tab === 'UNIDADES') {
      this.unitsList?.load();
    } else if (tab === 'CARGOS') {
      this.cargosList?.load();
    } else if (tab === 'SETORES') {
      this.sectorsList?.loadPage(0, true);
    } else if (tab === 'RISCOS') {
      this.risksList?.loadPage(0, true);
    } else if (tab === 'EPIS') {
      this.equipmentsList?.loadPage(0, true);
    } else if (tab === 'FUNCIONARIOS') {
      // dynamically import the employees component module and set promise so template can render
      this.employeesCompPromise = import('./funcionarios/employees-list.component').then(m => m.EmployeesListComponent);
    }
    // other tabs are placeholders; no action required
  }
}
