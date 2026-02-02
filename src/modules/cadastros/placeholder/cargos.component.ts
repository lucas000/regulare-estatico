// placeholder component for cargos
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cargos',
  standalone: true,
  imports: [CommonModule],
  template: `<p>Cargos - em construção</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CargosComponent {}
