import { Component, inject, OnInit, signal, effect, ChangeDetectorRef, untracked, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { FilterByStatusPipe } from './filter-by-status.pipe'; // Importe o Pipe aqui
import { SessionService } from '../../core/services/session.service';
import { DashboardService } from './dashboard.service';
import { DashboardStats, AgendaItem } from './dashboard.model';
import { LicenseDialogComponent } from '../licencas/components/license-dialog.component';
import { EpiDeliveryDialogComponent } from '../epis/epi-delivery-dialog/epi-delivery-dialog.component';
import { ConditionDialogComponent } from '../licencas/components/condition-dialog.component';
import { CompaniesService } from '../cadastros/services/companies.service'; 
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType, Chart, registerables } from 'chart.js';

// Registra os componentes do Chart.js (Necessário para a v4+)
Chart.register(...registerables);

export interface Obligation {
  id: string;
  nome: string;
  tipo: 'Licenças' | 'Condicionantes' | 'EPI';
  status: 'em_dia' | 'a_vencer' | 'vencido';
  dataVencimento: Date;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatIconModule, 
    MatTableModule, 
    MatButtonModule,
    MatDialogModule,
    MatProgressBarModule,
    BaseChartDirective,
    FilterByStatusPipe // Adicione o Pipe aos imports do componente standalone
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private readonly session = inject(SessionService);
  private readonly dashboardService = inject(DashboardService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly dialog = inject(MatDialog);
  private readonly firestore = inject(Firestore);
  private readonly companiesService = inject(CompaniesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  stats = signal<DashboardStats | null>(null);
  public rawData = signal<Obligation[]>([]);
  loading = signal(false);

  // --- CÁLCULOS DE CONFORMIDADE ---
  public totalItems = computed(() => this.rawData().length);
  public inCompliance = computed(() => this.rawData().filter(x => x.status === 'em_dia').length);
  public upcoming = computed(() => this.rawData().filter(x => x.status === 'a_vencer').length);
  public expired = computed(() => this.rawData().filter(x => x.status === 'vencido').length);

  public complianceIndex = computed(() => {
    if (this.totalItems() === 0) return 0;
    return Math.round((this.inCompliance() / this.totalItems()) * 100);
  });

  public riskInfo = computed(() => {
    const index = this.complianceIndex();
    if (index >= 80) return { label: 'Baixo Risco', color: '#2ecc71', class: 'risk-low' };
    if (index >= 60) return { label: 'Médio Risco', color: '#f1c40f', class: 'risk-medium' };
    return { label: 'Alto Risco', color: '#e74c3c', class: 'risk-high' };
  });

  public pendenciesInfo = computed(() => {
    const count = this.expired() + this.upcoming();
    return {
      label: count.toString(),
      class: count > 0 ? 'pendencies-high' : 'pendencies-low'
    };
  });

  public summaryByType = computed(() => {
    const types: ('Licenças' | 'Condicionantes' | 'EPI')[] = 
      ['Licenças', 'Condicionantes', 'EPI'];
    return types.map(tipo => {
      const items = this.rawData().filter(x => x.tipo === tipo);
      const total = items.length;
      const inDay = items.filter(x => x.status === 'em_dia').length;
      const upcoming = items.filter(x => x.status === 'a_vencer').length;
      const irregular = items.filter(x => x.status === 'vencido').length;
      const percentage = total > 0 ? Math.round((inDay / total) * 100) : 0;
      return { tipo, total, inDay, upcoming, irregular, percentage };
    });
  });

  public upcoming30Days = computed(() => {
    const now = new Date();
    const limit = new Date();
    limit.setDate(now.getDate() + 30);
    return this.rawData()
      .filter(x => x.dataVencimento > now && x.dataVencimento <= limit)
      .sort((a, b) => a.dataVencimento.getTime() - b.dataVencimento.getTime());
  });

  // --- CONFIGURAÇÃO DO GRÁFICO ---
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { 
        position: 'bottom' 
      } 
    }
  };
  public pieChartData = computed<ChartData<'pie'>>(() => ({
    labels: ['Em Dia', 'A Vencer', 'Vencidos'],
    datasets: [{
      data: [this.inCompliance(), this.upcoming(), this.expired()],
      backgroundColor: ['#2ecc71', '#f1c40f', '#e74c3c']
    }]
  }));
  public pieChartType: ChartType = 'pie';

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

  ngOnInit() {
    // Fallback: Se em 2 segundos nada carregar pelo effect, força uma carga inicial
    console.log('Dashboard: Inicializado');
    setTimeout(() => { if (this.rawData().length === 0) this.loadDashboardData(); }, 2000);
  }

  async loadDashboardData(companyId?: string) {
    this.loading.set(true);
    try {
      const stats = await this.dashboardService.getStats(companyId);
      this.stats.set(stats);

      // Mapeia os dados reais do serviço para o signal rawData
      // Consolidamos itens da agenda e de próximos vencimentos
      const allItems = [
        ...(stats.agenda || []),
        ...(stats.upcoming || [])
      ];

      const obligations: Obligation[] = allItems.map(item => ({
        id: item.id || '',
        nome: item.document || 'Documento sem nome',
        tipo: this.mapType(item.type),
        status: this.mapStatus(item.status),
        dataVencimento: this.parseDateString(item.date) // Usar o parser robusto
      }));

      // Remove duplicados caso o mesmo item esteja na agenda e em vencimentos
      const uniqueObligations = Array.from(new Map(obligations.map(o => [o.id, o])).values());
      
      this.rawData.set(uniqueObligations);

      console.log('Dashboard: Dados reais carregados do serviço', uniqueObligations);
    } catch (err) {
      console.error('Dashboard: Erro ao carregar estatísticas:', err);
    } finally {
      this.loading.set(false);
      this.cd.markForCheck();
    }
  }

  /**
   * Função robusta para parsear strings de data em objetos Date.
   * Tenta DD/MM/YYYY primeiro, depois YYYY-MM-DD ou outros formatos padrão.
   */
  private parseDateString(dateStr: string | Date): Date {
    if (!dateStr) return new Date('Invalid Date');
    if (dateStr instanceof Date) return dateStr; // Já é um objeto Date

    try {
      let date: Date;
      if (dateStr.includes('/')) { // Assume DD/MM/YYYY
        const [d, m, y] = dateStr.split('/').map(Number);
        date = new Date(y, m - 1, d);
      } else { // Assume YYYY-MM-DD ou outros formatos padrão
        date = new Date(dateStr);
      }
      return isNaN(date.getTime()) ? new Date('Invalid Date') : date;
    } catch { return new Date('Invalid Date'); }
  }

  private mapType(type: string): 'Licenças' | 'Condicionantes' | 'EPI' {
    if (type === 'Condicionante') return 'Condicionantes';
    if (type === 'EPI') return 'EPI';
    return 'Licenças';
  }

  private mapStatus(serviceStatus: string): 'em_dia' | 'a_vencer' | 'vencido' {
    const status = (serviceStatus || '').toLowerCase();
    if (status.includes('vencid') || status.includes('atras')) return 'vencido';
    if (status.includes('vencer') || status.includes('pendente')) return 'a_vencer';
    return 'em_dia';
  }

  userName() { return this.session.user()?.name ?? 'Usuário'; }
  companyName() { return this.session.adminScopeCompanyName() || 'Todas as Empresas'; }

  getDaysDiff(date: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  getAbsoluteDays(date: Date): string { // Alterado para retornar string
    const days = this.getDaysDiff(date);
    if (isNaN(days)) {
      return 'data inválida'; // Mensagem amigável para datas inválidas
    }
    return Math.abs(days).toString();
  }

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

  navigateTo(type: 'Licenças' | 'Condicionantes' | 'EPI' | string, status?: string) {
    // Usamos o caminho absoluto baseado no app.routes.ts para evitar redirecionamentos ao login
    // O prefixo '/app' é o shell definido no seu roteamento principal
    let path: string;
    let finalStatus = status;

    switch (type) {
      case 'Licenças':
        path = 'licencas';
        // Traduz o status genérico do dashboard para a chave técnica da tela de licenças
        if (status === 'vencido') finalStatus = 'vencida';
        else finalStatus = status;
        break;
      case 'Condicionantes':
        path = 'condicionantes';
        // Para condicionantes, 'em_dia' no dashboard equivale ao status 'cumprida'
        if (status === 'em_dia') finalStatus = 'cumprida';
        else if (status === 'vencido') finalStatus = 'vencida';
        else finalStatus = status;
        break;
      case 'EPI':
        path = 'epis';
        // Para EPIs mantemos o status padrão
        break;
      default: path = type; // Fallback for direct path strings like 'licencas'
    }
    this.router.navigate(['/app', path], {
      state: { status: finalStatus }
    });
  }

  async openItem(item: Obligation | AgendaItem) {
    if (!item.id) return;

    this.loading.set(true);
    try {
      let dialogComponent: any;
      let dialogData: any = {};
      let config = { width: '900px', maxWidth: '95vw', disableClose: true };

      // Normalização para suportar ambos os modelos (Obligation e AgendaItem)
      const rawType = (item as any).tipo || (item as any).type;
      const isEpi = rawType === 'EPI';
      const isLicense = rawType === 'Licença' || rawType === 'Licenças';
      const isCondition = rawType === 'Condicionante' || rawType === 'Condicionantes';

      // 1. Identifica o tipo e busca o documento completo no Firestore
      if (isEpi) {
        const docRef = doc(this.firestore, 'epi_deliveries', item.id);
        const sn = await getDoc(docRef);
        if (!sn.exists()) throw new Error('Entrega não encontrada');
        
        dialogComponent = EpiDeliveryDialogComponent;
        dialogData = { ...sn.data(), id: sn.id };

      } else if (isLicense) {
        const docRef = doc(this.firestore, 'licenses', item.id);
        const sn = await getDoc(docRef);
        if (!sn.exists()) throw new Error('Licença não encontrada');
        
        // Licenças precisam da lista de empresas para o select no modal
        const companies = await this.companiesService.listCompanies();
        
        dialogComponent = LicenseDialogComponent;
        dialogData = { ...sn.data(), id: sn.id, isEdit: true, companies };

      } else if (isCondition) {
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