import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-epis',
  standalone: true,
  imports: [CommonModule],
  template: `<p>EPIs - em construção</p>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EpisComponent {}
