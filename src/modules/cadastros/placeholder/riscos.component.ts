import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-riscos',
  standalone: true,
  imports: [CommonModule],
  template: `<p>Riscos - em construção</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RiscosComponent {}
