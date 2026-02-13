import { Injectable } from '@angular/core';
import { Unit } from '../models/unit.model';
import { BaseFirestoreService } from '../../../core/services/base-firestore.service';
import { getDocs, query, limit, orderBy, where, startAfter } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class UnitsRepository extends BaseFirestoreService<Unit> {
  protected override collectionPath = 'units';

  async listAll(max = 200): Promise<Unit[]> {
    const q = query(this.colRef(), limit(max));
    const sn = await getDocs(q as any);
    return sn.docs.map(d => d.data() as Unit);
  }

  async create(unit: Unit): Promise<void> {
    await this.set(unit);
  }

  async updateUnit(id: string, partial: Partial<Unit>): Promise<void> {
    await this.update(id, partial as Partial<Unit>);
  }

  async getById(id: string): Promise<Unit | null> {
    return this.get(id);
  }

  async deleteUnit(id: string): Promise<void> {
    return this.delete(id);
  }

  async listByCompany(companyId: string, max = 200): Promise<Unit[]> {
    const q = query(this.colRef(), where('companyId', '==', companyId), limit(max));
    const sn = await getDocs(q as any);
    return sn.docs.map(d => d.data() as Unit);
  }

  // Paged listing by name with optional companyId filter and startAfter document
  async listByNamePaged(companyId: string | null, term: string, pageSize: number, startAfterDoc?: any) {
    const col = this.colRef();
    const constraints: any[] = [];

    if (companyId) constraints.push(where('companyId', '==', companyId));

    constraints.push(orderBy('name'));
    if (term && term.trim().length) {
      const t = term.trim();
      constraints.push(where('name', '>=', t));
      constraints.push(where('name', '<=', t + '\uf8ff'));
    }
    constraints.push(limit(pageSize));
    if (startAfterDoc) constraints.push(startAfter(startAfterDoc));
    const q = query(col, ...constraints);
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => d.data());
    const lastDoc = snap.docs.at(-1) ?? null;
    return { docs, lastDoc };
  }
}
