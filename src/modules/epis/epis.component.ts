import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-epis',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <mat-card>
      <h2>EPIs</h2>
      <p>Gestão de EPIs e entregas por colaborador.</p>
    </mat-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EpisComponent {}
