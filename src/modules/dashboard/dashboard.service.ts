import { Injectable, inject } from '@angular/core';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';
import { DashboardStats, AgendaItem } from './dashboard.model';
import { License, LicenseCondition, calculateLicenseStatus, calculateConditionStatus } from '../licencas/models/license.model';
import { EpiDelivery } from '../epis/models/epi-delivery.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly firestore = inject(Firestore);

  async getStats(companyId?: string): Promise<DashboardStats> {
    const id = (companyId === 'admin' || !companyId) ? undefined : companyId;

    const [licenses, conditions, epis] = await Promise.all([
      this.fetchData<License>('licenses', id),
      this.fetchData<LicenseCondition>('license_conditions', id),
      this.fetchData<EpiDelivery>('epi_deliveries', id)
    ]);

    // 1. Mapeia Licenças para Agenda
    const licenseItems: AgendaItem[] = licenses.map((l: any) => ({
      id: l.id,
      date: l.expirationDate,
      type: 'Licença',
      document: l.documentType || 'Licença',
      companyName: l.companyName || 'N/A',
      status: this.mapStatus(calculateLicenseStatus(l.expirationDate)),
      daysRemaining: this.calculateDaysRemaining(l.expirationDate)
    }));

    // 2. Mapeia Condicionantes para Agenda
    const conditionItems: AgendaItem[] = conditions.map((c: any) => ({
      id: c.id, // Usa o ID da própria condicionante para permitir a abertura do modal correto
      date: c.dueDate,
      type: 'Condicionante',
      document: c.description || 'Condicionante',
      companyName: c.companyName || 'N/A',
      status: c.status === 'cumprida' ? 'Cumprida' : this.mapStatus(calculateConditionStatus(c.dueDate)),
      daysRemaining: this.calculateDaysRemaining(c.dueDate)
    }));

    // 3. Mapeia EPIs (Validade do CA dos itens das entregas) para Agenda
    const epiItems: AgendaItem[] = [];
    epis.forEach(delivery => {
      delivery.items?.forEach((item: any) => {
        epiItems.push({
          id: delivery.id,
          date: item.validUntil,
          type: 'EPI',
          document: item.name,
          companyName: delivery.companyName || 'N/A',
          status: this.isExpired(item.validUntil) ? 'Vencida' : 'Em dia',
          daysRemaining: this.calculateDaysRemaining(item.validUntil)
        });
      });
    });

    // Consolida e ordena por data
    const allItems = [...licenseItems, ...conditionItems, ...epiItems]
      .filter(i => !!i.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const upcoming = allItems.filter(i => i.status === 'A vencer' || i.status === 'Vencida').slice(0, 10);
    const fullAgenda = allItems.slice(0, 5);

    return {
      licenses: {
        emDia: licenses.filter((l: License) => calculateLicenseStatus(l.expirationDate) === 'em_dia').length,
        aVencer: licenses.filter((l: License) => calculateLicenseStatus(l.expirationDate) === 'a_vencer').length,
        vencidas: licenses.filter((l: License) => calculateLicenseStatus(l.expirationDate) === 'vencida').length,
      },
      conditions: {
        cumpridas: conditions.filter((c: LicenseCondition) => c.status === 'cumprida').length,
        pendentes: conditions.filter((c: LicenseCondition) => calculateConditionStatus(c.dueDate) === 'pendente' || calculateConditionStatus(c.dueDate) === 'a_vencer').length,
        vencidas: conditions.filter((c: LicenseCondition) => calculateConditionStatus(c.dueDate) === 'vencida').length,
      },
      epis: {
        // Exemplo simplificado baseado na validade do CA dos itens entregues
        ok: epis.filter((e: EpiDelivery) => e.items && e.items.length > 0 && e.items.every((i: any) => !this.isExpired(i.validUntil))).length,
        aVencer: 0, // Lógica de 'a vencer' para EPI depende de regra de negócio (ex: 30 dias antes da troca)
        vencidas: epis.filter((e: EpiDelivery) => e.items?.some((i: any) => this.isExpired(i.validUntil))).length || 0,
      },
      agenda: fullAgenda,
      upcoming: upcoming
    };
  }

  private mapStatus(s: string): any {
    if (s === 'em_dia') return 'Em dia';
    if (s === 'a_vencer') return 'A vencer';
    if (s === 'vencida') return 'Vencida';
    return 'Pendente';
  }

  private async fetchData<T>(collectionPath: string, companyId?: string): Promise<T[]> {
    const col = collection(this.firestore, collectionPath);
    const constraints: any[] = [];
    
    // Removido o filtro de 'deleted' por padrão, pois se o campo não existir no doc, 
    // o Firestore exclui o registro do resultado. Filtramos manualmente no map.
    
    // Adiciona o filtro apenas se o ID for válido, evitando o erro de 'undefined' no where()
    if (companyId) {
      constraints.push(where('companyId', '==', companyId));
    }

    const q = query(col, ...constraints);
    const sn = await getDocs(q);
    
    // Filtramos documentos deletados em memória para garantir que registros sem o campo 'deleted' apareçam
    return sn.docs
      .map(d => ({ id: d.id, ...d.data() } as any))
      .filter(doc => doc.deleted !== true) as T[];
  }

  private calculateDaysRemaining(dateStr?: string): number | undefined {
    if (!dateStr) return undefined;
    try {
      let date: Date;
      if (dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/').map(Number);
        date = new Date(y, m - 1, d);
      } else {
        date = new Date(dateStr);
      }
      const today = new Date();
      today.setHours(0,0,0,0);
      const diffTime = date.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch { return undefined; }
  }

  private isExpired(dateStr?: string): boolean {
    if (!dateStr) return false;
    try {
      // Tenta tratar DD/MM/YYYY ou YYYY-MM-DD
      let date: Date;
      if (dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/').map(Number);
        date = new Date(y, m - 1, d);
      } else {
        date = new Date(dateStr);
      }
      
      if (isNaN(date.getTime())) return false;
      
      const today = new Date();
      today.setHours(0,0,0,0);
      
      return date.getTime() < today.getTime();
    } catch { return false; }
  }

  private getEmptyStats(): DashboardStats {
    return {
      licenses: { emDia: 0, aVencer: 0, vencidas: 0 },
      conditions: { cumpridas: 0, pendentes: 0, vencidas: 0 },
      epis: { ok: 0, aVencer: 0, vencidas: 0 },
      agenda: [],
      upcoming: []
    };
  }
}