import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

export interface AuditHistoryData {
  title?: string;
  createdAt?: string;
  createdBy?: { uid?: string; name?: string; email?: string };
  updatedAt?: string;
  updatedBy?: { uid?: string; name?: string; email?: string };
}

@Component({
  selector: 'app-audit-history-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
  ],
  template: `
    <div class="audit-dialog">
      <div class="audit-header">
        <mat-icon class="header-icon">history</mat-icon>
        <h2>Histórico de Alterações</h2>
      </div>

      <mat-dialog-content>
        <div class="audit-content">
          <!-- Criação -->
          <div class="audit-section">
            <div class="section-label">
              <mat-icon>add_circle_outline</mat-icon>
              <span>Criado</span>
            </div>
            <div class="section-details">
              <div class="detail-row" *ngIf="data.createdAt">
                <span class="label">Data:</span>
                <span class="value">{{ formatDateTime(data.createdAt) }}</span>
              </div>
              <div class="detail-row" *ngIf="data.createdBy?.name">
                <span class="label">Por:</span>
                <span class="value">{{ data.createdBy?.name }}</span>
              </div>
              <div class="detail-row" *ngIf="data.createdBy?.email">
                <span class="label">E-mail:</span>
                <span class="value email">{{ data.createdBy?.email }}</span>
              </div>
              <div class="no-data" *ngIf="!data.createdAt && !data.createdBy">
                <span>Informação não disponível</span>
              </div>
            </div>
          </div>

          <mat-divider></mat-divider>

          <!-- Última Atualização -->
          <div class="audit-section">
            <div class="section-label">
              <mat-icon>edit</mat-icon>
              <span>Última Atualização</span>
            </div>
            <div class="section-details">
              <ng-container *ngIf="data.updatedAt || data.updatedBy; else noUpdate">
                <div class="detail-row" *ngIf="data.updatedAt">
                  <span class="label">Data:</span>
                  <span class="value">{{ formatDateTime(data.updatedAt) }}</span>
                </div>
                <div class="detail-row" *ngIf="data.updatedBy?.name">
                  <span class="label">Por:</span>
                  <span class="value">{{ data.updatedBy?.name }}</span>
                </div>
                <div class="detail-row" *ngIf="data.updatedBy?.email">
                  <span class="label">E-mail:</span>
                  <span class="value email">{{ data.updatedBy?.email }}</span>
                </div>
              </ng-container>
              <ng-template #noUpdate>
                <div class="no-data">
                  <span>Nenhuma atualização registrada</span>
                </div>
              </ng-template>
            </div>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="close()">Fechar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .audit-dialog {
      min-width: 320px;
      max-width: 400px;
        padding: 8px;
    }

    .audit-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 24px;
      background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%);
      color: white;
      margin: -24px -24px 16px -24px;
      border-radius: 4px 4px 0 0;

      h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 500;
      }

      .header-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .audit-content {
      padding: 8px;
    }

    .audit-section {
      padding: 8px 0;
    }

    .section-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      color: #1565c0;
      margin-bottom: 12px;
      font-size: 14px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .section-details {
      padding-left: 26px;
    }

    .detail-row {
      display: flex;
      gap: 8px;
      margin-bottom: 6px;
      font-size: 13px;

      .label {
        color: #666;
        min-width: 50px;
      }

      .value {
        color: #333;
        font-weight: 500;

        &.email {
          font-weight: 400;
          color: #1565c0;
        }
      }
    }

    .no-data {
      color: #999;
      font-style: italic;
      font-size: 13px;
    }

    mat-divider {
      margin: 12px 0;
    }

    mat-dialog-content {
      padding: 0 24px !important;
      margin: 0 !important;
    }

    mat-dialog-actions {
      padding: 12px 24px !important;
      margin: 0 !important;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditHistoryDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AuditHistoryDialogComponent>);
  readonly data: AuditHistoryData = inject(MAT_DIALOG_DATA) ?? {};

  formatDateTime(isoString?: string): string {
    if (!isoString) return '-';

    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;

      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
