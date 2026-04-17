import { Component, inject, OnInit, signal, effect, ChangeDetectorRef, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { SessionService } from '../../core/services/session.service';
import { DashboardService } from './dashboard.service';
import { DashboardStats, AgendaItem } from './dashboard.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatTableModule, MatButtonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private readonly session = inject(SessionService);
  private readonly dashboardService = inject(DashboardService);
  private readonly cd = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

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

  openItem(item: AgendaItem) {
    if (item.type === 'EPI') {
      this.router.navigate(['/epis']);
    } else {
      this.router.navigate(['/licencas']);
    }
  }
}