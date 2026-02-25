import { Injectable } from '@angular/core';
import { CompanyRisk } from '../models/company-risk.model';
import { BaseFirestoreService } from '../../../core/services/base-firestore.service';
import { getDocs, query, where, orderBy, limit, startAfter } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class CompanyRisksRepository extends BaseFirestoreService<CompanyRisk> {
  protected override collectionPath = 'company_risks';

  async listByCompany(companyId: string, max = 500): Promise<CompanyRisk[]> {
    const q = query(this.colRef(), where('companyId', '==', companyId), limit(max));
    const sn = await getDocs(q as any);
    return sn.docs.map(d => d.data() as CompanyRisk);
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
    const snap = await getDocs(q as any);
    const docs = snap.docs.map(d => d.data());
    const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
    return { docs, lastDoc };
  }

  async create(item: CompanyRisk): Promise<void> {
    return this.set(item);
  }

  async updateRisk(id: string, partial: Partial<CompanyRisk>) {
    return this.update(id, partial as Partial<CompanyRisk>);
  }

  async deleteRisk(id: string) {
    return this.delete(id);
  }
}

