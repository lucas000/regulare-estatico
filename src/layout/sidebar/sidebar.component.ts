import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { SessionService } from '../../core/services/session.service';
import { UserProfile } from '../../core/models/user.model';

interface MenuItem {
  label: string;
  icon: string;
  path: string;
  roles?: readonly UserProfile[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatListModule, MatIconModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private readonly session = inject(SessionService);

  private readonly menu: readonly MenuItem[] = [
    { label: 'Dashboard', icon: 'dashboard', path: '/app/dashboard' },
    { label: 'Licenças', icon: 'assignment', path: '/app/licencas' },
    { label: 'Condicionantes', icon: 'rule', path: '/app/condicionantes' },
    { label: 'EPIs', icon: 'health_and_safety', path: '/app/epis' },
    { label: 'Alertas', icon: 'notifications', path: '/app/alertas' },
    { label: 'Cadastros', icon: 'library_books', path: '/app/cadastros' },
    { label: 'Usuários', icon: 'people', path: '/app/usuarios', roles: ['ADMIN', 'CONSULTOR'] },
  ] as const;

  readonly visibleMenu = computed(() => {
    const u = this.session.user();
    return this.menu.filter(m => !m.roles || (u && m.roles.includes(u.profile)));
  });
}
