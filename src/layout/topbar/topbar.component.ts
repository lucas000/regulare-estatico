import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { SessionService } from '../../core/services/session.service';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { Subscription, Observable, merge, of } from 'rxjs';
import { MatBadgeModule } from '@angular/material/badge';

@Component({
  selector: 'app-topbar',
  standalone: true,
    imports: [CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatSelectModule, MatOptionModule, MatBadgeModule],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent implements OnDestroy {
  @Output() toggle = new EventEmitter<void>();
  readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  title$: Observable<string>;
  private sub: Subscription;

  // placeholders for future badge counts
  notificationsCount = 0;
  alertsCount = 0;

  constructor() {
    // derive title from deepest activated route data.title or fallback to path segment
    const events$ = this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.computeTitleFromRoute())
    );

    // Emit initial title immediately (so F5 / page load shows correct title), and then follow navigation events
    this.title$ = merge(of(this.computeTitleFromRoute()), events$);

    // subscribe once to keep alive
    this.sub = this.title$.subscribe();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  logout() { this.session.logout(); }

  userName(): string {
    const u = this.session.user();
    return u?.name ?? 'Usuário';
  }

  companyName(): string {
    const u = this.session.user();
    return (u && (u.name ?? u.name)) ?? '';
  }

  private computeTitleFromRoute(): string {
    let child = this.route.firstChild;
    while (child?.firstChild) child = child.firstChild;
    const dataTitle = child?.snapshot?.data?.['title'];
    if (dataTitle) return dataTitle;
    const url = this.router.url || '';
    const seg = url.split('/').filter(Boolean).at(-1) ?? '';
    return this.humanizeSegment(seg) || 'Dashboard';
  }

  private humanizeSegment(seg: string) {
    if (!seg) return '';
    return seg.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  }
}
