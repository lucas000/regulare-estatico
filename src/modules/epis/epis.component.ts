import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { EpiDeliveriesListComponent } from './epi-deliveries-list/epi-deliveries-list.component';

@Component({
  selector: 'app-epis',
  standalone: true,
  imports: [CommonModule, MatCardModule, EpiDeliveriesListComponent],
  template: `
    <div class="epis-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Entregas de EPIs</mat-card-title>
          <mat-card-subtitle>Gestão de fornecimento de Equipamentos de Proteção Individual por colaborador.</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <app-epi-deliveries-list></app-epi-deliveries-list>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .epis-container {
      padding: 24px;
    }
    mat-card-header {
      margin-bottom: 16px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EpisComponent {}
