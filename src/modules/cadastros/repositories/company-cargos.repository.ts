import { Injectable } from '@angular/core';
import { CompanyCargo } from '../models/cargo.model';
import { BaseFirestoreService } from '../../../core/services/base-firestore.service';
import { getDocs, query, limit, orderBy, where, startAfter } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class CompanyCargosRepository extends BaseFirestoreService<CompanyCargo> {
  protected override collectionPath = 'company_cargos';

  async listByCompany(companyId: string, max = 500): Promise<CompanyCargo[]> {
    const q = query(this.colRef(), where('companyId', '==', companyId), limit(max));
    const sn = await getDocs(q as any);
    return sn.docs.map(d => d.data() as CompanyCargo);
  }

  async listByCompanyPaged(companyId: string, term: string, pageSize: number, startAfterDoc?: any) {
    const col = this.colRef();
    const constraints: any[] = [];
    constraints.push(where('companyId', '==', companyId));
    constraints.push(orderBy('name'));
    
    if (term && term.trim().length) {
      const t = term.trim().toUpperCase();
      constraints.push(where('name', '>=', t));
      constraints.push(where('name', '<=', t + '\uf8ff'));
    }
    
    constraints.push(limit(pageSize));
    if (startAfterDoc) constraints.push(startAfter(startAfterDoc));
    
    const q = query(col, ...constraints);
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => d.data());
    const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
    return { docs, lastDoc };
  }

  async searchByCompany(companyId: string, term: string, max = 20): Promise<CompanyCargo[]> {
    const t = (term || '').trim().toUpperCase();
    if (!t) return [];

    const col = this.colRef();

    // Query by name prefix within company
    const qName = query(col, 
      where('companyId', '==', companyId),
      orderBy('name'), 
      where('name', '>=', t), 
      where('name', '<=', t + '\uf8ff'), 
      limit(max)
    );
    const snName = await getDocs(qName as any);
    const byName = snName.docs.map((d) => d.data() as CompanyCargo);

    // Query by CBO prefix within company
    const qCbo = query(col, 
      where('companyId', '==', companyId),
      orderBy('cbo'), 
      where('cbo', '>=', t), 
      where('cbo', '<=', t + '\uf8ff'), 
      limit(max)
    );
    const snCbo = await getDocs(qCbo as any);
    const byCbo = snCbo.docs.map((d) => d.data() as CompanyCargo);

    const map = new Map<string, CompanyCargo>();
    for (const c of [...byName, ...byCbo]) {
      if (!map.has(c.id)) map.set(c.id, c);
      if (map.size >= max) break;
    }
    return Array.from(map.values());
  }

  async create(item: CompanyCargo): Promise<void> {
    return this.set(item);
  }

  async updateCargo(id: string, partial: Partial<CompanyCargo>) {
    return this.update(id, partial as Partial<CompanyCargo>);
  }

  async deleteCargo(id: string) {
    return this.delete(id);
  }
}
