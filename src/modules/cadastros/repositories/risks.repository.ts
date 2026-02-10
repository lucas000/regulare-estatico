import { Injectable } from '@angular/core';
import { BaseFirestoreService } from '../../../core/services/base-firestore.service';
import { Risk } from '../models/risk.model';
import { getDocs, limit, orderBy, query, startAfter, where } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class RisksRepository extends BaseFirestoreService<Risk> {
  protected override collectionPath = 'risks';

  async create(risk: Risk): Promise<void> {
    await this.set(risk);
  }

  async updateRisk(id: string, patch: Partial<Risk>): Promise<void> {
    await this.update(id, patch as Partial<Risk>);
  }

  async getById(id: string): Promise<Risk | null> {
    return this.get(id);
  }

  /**
   * Busca paginada idêntica ao padrão de Empresas, usando `name`.
   * Regra do projeto: `name` é persistido sempre em CAIXA ALTA.
   */
  async listByNamePaged(companyId: string | null, term: string, pageSize: number, startAfterDoc?: any) {
    const col = this.colRef();
    const constraints: any[] = [];

    if (companyId) constraints.push(where('companyId', '==', companyId));

    constraints.push(orderBy('name'));

    const t = String(term ?? '').trim().toUpperCase();
    if (t) {
      constraints.push(where('name', '>=', t));
      constraints.push(where('name', '<=', t + '\uf8ff'));
    }

    constraints.push(limit(pageSize));
    if (startAfterDoc) constraints.push(startAfter(startAfterDoc));

    const qy = query(col, ...constraints);
    const snap = await getDocs(qy as any);
    const docs = snap.docs.map((d) => d.data() as Risk);
    const lastDoc = snap.docs.at(-1) ?? null;
    return { docs, lastDoc };
  }
}
