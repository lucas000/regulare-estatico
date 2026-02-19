import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDeleteData {
  title?: string;
  message?: string;
  itemName?: string;
}

@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="confirm-delete-dialog">
      <div class="dialog-header">
        <mat-icon class="warning-icon">warning</mat-icon>
        <h2>{{ data.title || 'Confirmar Exclusão' }}</h2>
      </div>

      <mat-dialog-content>
        <p class="message">{{ data.message || 'Tem certeza que deseja excluir este registro?' }}</p>
        <p class="item-name" *ngIf="data.itemName">
          <strong>{{ data.itemName }}</strong>
        </p>
        <p class="warning-text">
          <mat-icon>info</mat-icon>
          Esta ação pode ser revertida posteriormente pela administração.
        </p>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="cancel()">Cancelar</button>
        <button mat-flat-button color="warn" (click)="confirm()">
          <mat-icon>delete</mat-icon>
          Excluir
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-delete-dialog {
      min-width: 320px;
      max-width: 420px;
        padding: 10px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 24px;
      background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%);
      color: white;
      margin: -24px -24px 16px -24px;
      border-radius: 4px 4px 0 0;

      h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 500;
      }

      .warning-icon {
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
      border-left: 4px solid #d32f2f;
    }

    .warning-text {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #757575;
      margin: 0;
      padding: 8px 12px;
      background: #fff3e0;
      border-radius: 4px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #ff9800;
      }
    }

    mat-dialog-actions {
      padding: 16px 0 0 0;
      margin: 0;

      button {
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
export class ConfirmDeleteDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ConfirmDeleteDialogComponent>);
  readonly data: ConfirmDeleteData = inject(MAT_DIALOG_DATA) || {};

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
