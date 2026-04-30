import { Pipe, PipeTransform } from '@angular/core';
import { Obligation } from './dashboard.component'; // Importe a interface Obligation

@Pipe({
  name: 'filterByStatus',
  standalone: true
})
export class FilterByStatusPipe implements PipeTransform {
  transform(items: Obligation[] | null, status: 'em_dia' | 'a_vencer' | 'vencido'): Obligation[] {
    if (!items || items.length === 0) {
      return [];
    }
    return items.filter(item => item.status === status);
  }
}