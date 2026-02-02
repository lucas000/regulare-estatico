import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  template: `
    <div class="cadastros-full">
      <p>Em construção</p>
    </div>
  `,
  styles: [`.cadastros-full { width: 100%; padding: 16px; }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderComponent {}
