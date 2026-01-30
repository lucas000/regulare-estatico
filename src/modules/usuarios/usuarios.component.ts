import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <mat-card>
      <h2>Usuários</h2>
      <p>Gestão de usuários do sistema por empresa.</p>
    </mat-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosComponent {}
