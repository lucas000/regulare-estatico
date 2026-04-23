import { Component, inject, OnInit, signal, effect, ChangeDetectorRef, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { SessionService } from '../../core/services/session.service';
import { DashboardService } from './dashboard.service';
import { DashboardStats, AgendaItem } from './dashboard.model';
import { LicenseDialogComponent } from '../licencas/components/license-dialog.component';
import { EpiDeliveryDialogComponent } from '../epis/epi-delivery-dialog/epi-delivery-dialog.component';
import { ConditionDialogComponent } from '../licencas/components/condition-dialog.component';
import { CompaniesService } from '../cadastros/services/companies.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatIconModule, 
    MatTableModule, 
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private readonly session = inject(SessionService);
  private readonly dashboardService = inject(DashboardService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly dialog = inject(MatDialog);
  private readonly firestore = inject(Firestore);
  private readonly companiesService = inject(CompaniesService);

  stats = signal<DashboardStats | null>(null);
  loading = signal(false);

  agendaColumns = ['date', 'type', 'document', 'company', 'status'];
  upcomingColumns = ['type', 'document', 'company', 'date'];
  fullUpcomingColumns = ['type', 'document', 'company', 'date', 'daysRemaining', 'actions'];

  constructor() {
    // Reage automaticamente quando o scope da empresa muda na Topbar
    effect(() => {
      if (this.session.loading()) {
        console.log('Dashboard: Aguardando carregamento da sessão...');
        return;
      }

      // Resolve o ID da empresa seguindo exatamente o padrão do LicencasComponent
      const effectiveCompanyId = this.session.adminScopeCompanyId() || 
                                 this.session.user()?.companyId || 
                                 undefined;

      console.log('Dashboard: Carregando dados para empresa:', effectiveCompanyId);
      
      untracked(() => {
        this.loadDashboardData(effectiveCompanyId);
      });
    }, { allowSignalWrites: true });
  }

  ngOnInit() {}

  async loadDashboardData(companyId?: string) {
    this.loading.set(true);
    try {
      const data = await this.dashboardService.getStats(companyId);
      console.log('Dashboard: Dados recebidos:', data);
      this.stats.set(data);
    } catch (err) {
      console.error('Dashboard: Erro ao carregar estatísticas:', err);
      this.stats.set(null); // Garante que a tela reflita o erro
    } finally {
      this.loading.set(false);
      this.cd.markForCheck();
    }
  }

  userName() { return this.session.user()?.name ?? 'Usuário'; }
  companyName() { return this.session.adminScopeCompanyName() || 'Todas as Empresas'; }

  formatDateBR(dateStr: string) {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      // Ajuste de timezone para strings ISO simples
      date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
      return date.toLocaleDateString('pt-BR');
    } catch { return dateStr; }
  }

  async openItem(item: AgendaItem) {
    if (!item.id) return;

    this.loading.set(true);
    try {
      let dialogComponent: any;
      let dialogData: any = {};
      let config = { width: '900px', maxWidth: '95vw', disableClose: true };

      // 1. Identifica o tipo e busca o documento completo no Firestore
      if (item.type === 'EPI') {
        const docRef = doc(this.firestore, 'epi_deliveries', item.id);
        const sn = await getDoc(docRef);
        if (!sn.exists()) throw new Error('Entrega não encontrada');
        
        dialogComponent = EpiDeliveryDialogComponent;
        dialogData = { ...sn.data(), id: sn.id };

      } else if (item.type === 'Licença') {
        const docRef = doc(this.firestore, 'licenses', item.id);
        const sn = await getDoc(docRef);
        if (!sn.exists()) throw new Error('Licença não encontrada');
        
        // Licenças precisam da lista de empresas para o select no modal
        const companies = await this.companiesService.listCompanies();
        
        dialogComponent = LicenseDialogComponent;
        dialogData = { ...sn.data(), id: sn.id, isEdit: true, companies };

      } else if (item.type === 'Condicionante') {
        const docRef = doc(this.firestore, 'license_conditions', item.id);
        const sn = await getDoc(docRef);
        if (!sn.exists()) throw new Error('Condicionante não encontrada');
        
        dialogComponent = ConditionDialogComponent;
        dialogData = { ...sn.data(), id: sn.id, isEdit: true };
        config.width = '600px';
      }

      // 2. Abre o modal com os dados carregados
      if (dialogComponent) {
        const ref = this.dialog.open(dialogComponent, {
          ...config,
          data: dialogData
        });

        // 3. Se o usuário salvar no modal, recarrega o dashboard
        ref.afterClosed().subscribe(result => {
          if (result) {
            const effectiveCompanyId = this.session.adminScopeCompanyId() || 
                                       this.session.user()?.companyId || 
                                       undefined;
            this.loadDashboardData(effectiveCompanyId);
          }
        });
      }
    } catch (err) {
      console.error('Erro ao abrir item:', err);
    } finally {
      this.loading.set(false);
      this.cd.markForCheck();
    }
  }
}