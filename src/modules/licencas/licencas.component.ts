import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-licencas',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <mat-card>
      <h2>Licenças</h2>
      <p>Lista e gestão de licenças ambientais/regulatórias.</p>
    </mat-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LicencasComponent {}
