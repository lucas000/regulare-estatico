import { Injectable } from '@angular/core';
import { Company } from '../models/company.model';
import { BaseFirestoreService } from '../../../core/services/base-firestore.service';
import { getDocs, query, limit, orderBy, where, startAfter } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class CompaniesRepository extends BaseFirestoreService<Company> {
  protected override collectionPath = 'companies';

  async listAll(max = 200): Promise<Company[]> {
    const q = query(this.colRef(), limit(max));
    const sn = await getDocs(q as any);
    return sn.docs.map(d => d.data() as Company);
  }

  async create(company: Company): Promise<void> {
    await this.set(company);
  }

  async updateCompany(id: string, partial: Partial<Company>): Promise<void> {
    await this.update(id, partial as Partial<Company>);
  }

  async getById(id: string): Promise<Company | null> {
    return this.get(id);
  }

  async deleteCompany(id: string): Promise<void> {
    return this.delete(id);
  }

  // Add new paged listing method
  async listByNamePaged(term: string, pageSize: number, startAfterDoc?: any) {
    const col = this.colRef();
    const constraints = [];
    constraints.push(orderBy('name'));
    if (term && term.trim().length) {
      const t = term.trim();
      constraints.push(where('name', '>=', t));
      constraints.push(where('name', '<=', t + '\uf8ff'));
    }
    constraints.push(limit(pageSize));
    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }
    const q = query(col, ...constraints);
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => d.data());
    const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
    return { docs, lastDoc };
  }
}
