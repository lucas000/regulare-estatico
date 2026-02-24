import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDuplicateData {
  title?: string;
  message?: string;
  itemName?: string;
}

@Component({
  selector: 'app-confirm-duplicate-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="confirm-duplicate-dialog">
      <div class="dialog-header">
        <mat-icon class="info-icon">content_copy</mat-icon>
        <h2>{{ data.title || 'Confirmar Duplicação' }}</h2>
      </div>

      <mat-dialog-content>
        <p class="message">{{ data.message || 'Tem certeza que deseja duplicar este registro?' }}</p>
        <p class="item-name" *ngIf="data.itemName">
          <strong>{{ data.itemName }}</strong>
        </p>
        <p class="info-text">
          <mat-icon>info</mat-icon>
          Uma nova cópia será criada com o prefixo "Cópia" no nome.
        </p>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="cancel()">Cancelar</button>
        <button mat-flat-button color="primary" (click)="confirm()">
          <mat-icon>content_copy</mat-icon>
          Duplicar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-duplicate-dialog {
      min-width: 320px;
      max-width: 420px;
      padding: 10px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 24px;
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      color: white;
      margin: -24px -24px 16px -24px;
      border-radius: 4px 4px 0 0;

      h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 500;
      }

      .info-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
    }

    mat-dialog-content {
      padding: 8px 0;
    }

    .message {
      font-size: 15px;
      color: #424242;
      margin: 0 0 12px 0;
    }

    .item-name {
      background: #f5f5f5;
      padding: 12px 16px;
      border-radius: 4px;
      margin: 0 0 16px 0;
      font-size: 14px;
      color: #212121;
      border-left: 4px solid #1976d2;
    }

    .info-text {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #616161;
      background: #e3f2fd;
      padding: 10px 14px;
      border-radius: 4px;
      margin: 0;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #1976d2;
      }
    }

    mat-dialog-actions {
      padding: 16px 0 0 0;
      margin: 0;

      button {
        margin-left: 8px;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          margin-right: 4px;
        }
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDuplicateDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ConfirmDuplicateDialogComponent>);
  readonly data: ConfirmDuplicateData = inject(MAT_DIALOG_DATA) ?? {};

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}
