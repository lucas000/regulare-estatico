import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './dashboard.component.html',
  styles: [`
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 16px; margin-bottom: 16px; }
    .stat { display: grid; gap: 12px; }
    .stat-header { display: flex; align-items: center; gap: 8px; color: var(--muted); }
    .stat-value { font-size: 28px; font-weight: 600; }
    @media (max-width: 1024px) { .grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
    @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
    .company-badge { background: var(--color-primary); color: white; padding: 8px 16px; border-radius: 8px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .company-badge mat-icon { font-size: 20px; width: 20px; height: 20px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly session = inject(SessionService);

  isAdmin = computed(() => this.session.hasRole(['ADMIN'] as any));

  companyName = computed(() => {
    if (this.isAdmin()) {
      const scopedName = this.session.adminScopeCompanyName();
      return scopedName || 'Todas as empresas';
    }
    const user = this.session.user();
    return user?.name || 'Empresa';
  });

  userName = computed(() => {
    const user = this.session.user();
    return user?.name || 'Usuário';
  });
}
