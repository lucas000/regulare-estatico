import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AlertsService } from './alerts.service';

@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatListModule, MatIconModule, MatButtonModule],
  template: `
    <div class="panel-container">
      <div class="panel-header">
        <h2>Notificações</h2>
        <button mat-icon-button (click)="close()"><mat-icon>close</mat-icon></button>
      </div>

      <mat-nav-list class="notifications-list">
        <div *ngIf="alertsService.count() === 0" class="empty-state">
          <mat-icon>notifications_none</mat-icon>
          <p>Nenhuma notificação recente</p>
        </div>

        <mat-list-item *ngFor="let alert of alertsService.alerts()" class="notification-item">
          <mat-icon matListItemIcon [color]="alert.origemTipo === 'epi' ? 'accent' : 'primary'">
            {{ alert.origemTipo === 'epi' ? 'engineering' : 'description' }}
          </mat-icon>
          <div matListItemTitle class="alert-title">{{ alert.documento }}</div>
          <div matListItemLine class="alert-subtitle">
            {{ alert.companyName }}
          </div>
          <div matListItemLine class="alert-date">
            {{ alert.enviadoEm.toDate() | date:'dd/MM/yyyy HH:mm' }}
          </div>
        </mat-list-item>
      </mat-nav-list>
    </div>
  `,
  styles: [`
    .panel-container { height: 100vh; display: flex; flex-direction: column; width: 350px; background: white; }
    .panel-header { padding: 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; }
    .panel-header h2 { margin: 0; font-size: 1.2rem; }
    .notifications-list { flex: 1; overflow-y: auto; }
    .notification-item { border-bottom: 1px solid #f9f9f9; height: auto !important; padding: 12px 0; }
    .alert-title { font-weight: 600; white-space: normal; line-height: 1.2; font-size: 0.9rem; }
    .alert-subtitle { font-size: 0.8rem; color: #666; margin-top: 4px; }
    .alert-date { font-size: 0.75rem; color: #999; }
    .empty-state { text-align: center; padding: 40px 20px; color: #ccc; }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; }
  `]
})
export class NotificationsPanelComponent {
  public readonly alertsService = inject(AlertsService);
  private readonly dialogRef = inject(MatDialogRef);

  close() { this.dialogRef.close(); }
}