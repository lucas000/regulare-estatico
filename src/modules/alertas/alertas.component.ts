import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AlertsService } from './services/alerts.service';
import { SessionService } from '../../core/services/session.service';
import { Alert } from './models/alert.model';
import { Observable, map, of, switchMap } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatTableModule, 
    MatIconModule, 
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './alertas.component.html',
  styleUrls: ['./alertas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertasComponent {
  private readonly alertsService = inject(AlertsService);
  private readonly session = inject(SessionService);
  
  // Combina o perfil do usuário e o escopo selecionado (para ADMIN) para filtrar os alertas
  alertsList$: Observable<Alert[]> = toObservable(computed(() => {
    const user = this.session.user();
    if (!user) return { companyId: null, profile: null };
    
    // Se for ADMIN, respeita o escopo selecionado na Topbar
    if (user.profile === 'ADMIN') {
      return { companyId: this.session.adminScopeCompanyId(), profile: 'ADMIN' };
    }
    
    // Se for CLIENTE ou CONSULTOR, usa a empresa do próprio usuário
    return { companyId: user.companyId, profile: user.profile };
  })).pipe(
    switchMap(scope => {
      if (scope.profile === 'ADMIN') {
        // Se ADMIN selecionou uma empresa específica
        if (scope.companyId) {
          return this.alertsService.listByCompany(scope.companyId);
        }
        // Se ADMIN não selecionou empresa (vê todas)
        return this.alertsService.listAll();
      }
      
      // Para CLIENTE/CONSULTOR
      if (scope.companyId) {
        return this.alertsService.listByCompany(scope.companyId);
      }
      
      return of([]);
    }),
    map(alerts => (alerts || []).sort((a, b) => new Date(a.dataDisparo).getTime() - new Date(b.dataDisparo).getTime()))
  );
  
  // Colunas a serem exibidas na tabela
  get displayedColumns(): string[] {
    const cols = ['origemTipo', 'companyName', 'documento', 'dataBaseVencimento', 'diasRestantes', 'dataDisparo', 'enviado'];
    if (!this.isAdmin()) {
      return cols.filter(c => c !== 'companyName');
    }
    return cols;
  }

  isAdmin(): boolean {
    return this.session.hasRole(['ADMIN']);
  }

  getOrigemLabel(tipo: string): string {
    switch (tipo) {
      case 'licenca': return 'Licença';
      case 'condicionante': return 'Condicionante';
      case 'epi': return 'EPI';
      default: return tipo;
    }
  }

  getOrigemClass(tipo: string): string {
    return `tipo-${tipo}`;
  }

  getDiasRestantes(dataBaseVencimento: string): number {
    if (!dataBaseVencimento) return 0;
    const base = new Date(dataBaseVencimento);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // Calcula diferença em relação à data atual (hoje)
    const diffTime = base.getTime() - hoje.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
