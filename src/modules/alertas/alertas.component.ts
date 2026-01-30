import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './alertas.component.html',
  styleUrls: ['./alertas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertasComponent {}
