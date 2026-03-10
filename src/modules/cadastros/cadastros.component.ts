import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, AfterViewInit, ViewChild, ComponentRef, ViewContainerRef, effect } from '@angular/core';
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
              <mat-tab *ngIf="canSee('SETORES')" label="Setores">
                  <app-sectors-list></app-sectors-list>
              </mat-tab>
              <mat-tab *ngIf="canSee('CARGOS')" label="Cargos">
                  <app-cargos-list></app-cargos-list>
              </mat-tab>
              <mat-tab *ngIf="canSee('FUNCIONARIOS')" label="Funcionários">
                  <ng-template #employeesContainer></ng-template>
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
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    // Escutar mudanças no escopo admin para atualizar a visibilidade das abas e recarregar dados
    effect(() => {
      this.session.adminScopeCompanyId();
      this.cdr.markForCheck();
      
      // Forçar recarregamento da aba atual quando o escopo mudar
      if (this.tabGroup && this.tabGroup.selectedIndex !== null) {
        this.onTabChange(this.tabGroup.selectedIndex);
      }
    });
  }

  @ViewChild(MatTabGroup) tabGroup!: MatTabGroup;
  @ViewChild(CompaniesListComponent) companiesList?: CompaniesListComponent;
  @ViewChild(UnitsListComponent) unitsList?: UnitsListComponent;
  @ViewChild(CargosListComponent) cargosList?: CargosListComponent;
  @ViewChild(SectorsListComponent) sectorsList?: SectorsListComponent;
  @ViewChild(RisksListComponent) risksList?: RisksListComponent;
  @ViewChild(EquipmentsListComponent) equipmentsList?: EquipmentsListComponent;
  @ViewChild('employeesContainer', { read: ViewContainerRef }) employeesContainer?: ViewContainerRef;

  private employeesComponentRef: ComponentRef<any> | null = null;
  private employeesLoaded = false;

  canSee(tab: 'EMPRESAS' | 'UNIDADES' | 'FUNCIONARIOS' | 'CARGOS' | 'SETORES' | 'RISCOS' | 'EPIS') {
    const isAdmin = this.session.hasRole(['ADMIN'] as any);
    const isCliente = this.session.hasRole(['CLIENTE'] as any);
    const isGlobal = !this.session.adminScopeCompanyId();

    // ADMIN: acesso total
    if (isAdmin) {
      return true;
    }

    // CLIENTE: acesso somente dentro de Cadastros (Empresas, Unidades, Setores, Funcionários, Cargos)
    if (isCliente) {
      return tab === 'EMPRESAS' || tab === 'UNIDADES' || tab === 'SETORES' || tab === 'FUNCIONARIOS' || tab === 'CARGOS' || tab === 'RISCOS' || tab === 'EPIS';
    }

    // Outros perfis (ex.: CONSULTOR) ficam sem acesso por este novo requisito
    return false;
  }

  ngAfterViewInit(): void {
    const tabsOrder: Array<'EMPRESAS' | 'UNIDADES' | 'SETORES' | 'CARGOS' | 'FUNCIONARIOS' | 'RISCOS' | 'EPIS'> = [
      'EMPRESAS',
      'UNIDADES',
      'SETORES',
      'CARGOS',
      'FUNCIONARIOS',
      'RISCOS',
      'EPIS',
    ];

    const visibleTabs = tabsOrder.filter(t => this.canSee(t));
    const defaultIndex = visibleTabs.indexOf('EMPRESAS') >= 0 ? visibleTabs.indexOf('EMPRESAS') : 0;

    // Set the selected tab index and trigger load for that tab
    if (this.tabGroup) {
      this.tabGroup.selectedIndex = defaultIndex;
      // ensure initial tab's data is loaded
      this.onTabChange(defaultIndex);
    }
  }

  onTabChange(index: number): void {
    // Determine which visible tab is at the provided index and call its load method
    const tabsOrder: Array<'EMPRESAS' | 'UNIDADES' | 'SETORES' | 'CARGOS' | 'FUNCIONARIOS' | 'RISCOS' | 'EPIS'> = [
      'EMPRESAS', 'UNIDADES', 'SETORES', 'CARGOS', 'FUNCIONARIOS', 'RISCOS', 'EPIS'
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
      this.loadEmployeesComponent();
    }
    // other tabs are placeholders; no action required
  }

  private async loadEmployeesComponent(): Promise<void> {
    // Pequeno delay para garantir que o container do tab esteja renderizado
    await new Promise(resolve => setTimeout(resolve, 50));

    if (!this.employeesContainer) {
      console.warn('employeesContainer não disponível');
      return;
    }

    if (!this.employeesLoaded) {
      // Carregar o componente dinamicamente
      const { EmployeesListComponent } = await import('./funcionarios/employees-list.component');
      this.employeesContainer.clear();
      this.employeesComponentRef = this.employeesContainer.createComponent(EmployeesListComponent);
      this.employeesLoaded = true;
      this.cdr.markForCheck();
    } else if (this.employeesComponentRef) {
      // Se já carregado, recarregar os dados
      this.employeesComponentRef.instance.load(true);
    }
  }
}
