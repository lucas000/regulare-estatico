import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-funcionarios',
  standalone: true,
  imports: [CommonModule],
  template: `<p>Funcionários - em construção</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FuncionariosComponent {}
