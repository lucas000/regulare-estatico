import { Injectable } from '@angular/core';
import { License } from '../models/license.model';
import { BaseFirestoreService } from '../../../core/services/base-firestore.service';
import { getDocs, query, limit, orderBy, where, startAfter, QueryConstraint } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class LicensesRepository extends BaseFirestoreService<License> {
  protected override collectionPath = 'licenses';

  async listAll(max = 200): Promise<License[]> {
    const q = query(this.colRef(), limit(max));
    const sn = await getDocs(q as any);
    return sn.docs.map(d => d.data() as License);
  }

  async create(license: License): Promise<void> {
    await this.set(license);
  }

  async updateLicense(id: string, partial: Partial<License>): Promise<void> {
    await this.update(id, partial as Partial<License>);
  }

  async getById(id: string): Promise<License | null> {
    return this.get(id);
  }

  async deleteLicense(id: string): Promise<void> {
    return this.delete(id);
  }

  async listByCompany(companyId: string, max = 200): Promise<License[]> {
    const q = query(this.colRef(), where('companyId', '==', companyId), limit(max));
    const sn = await getDocs(q as any);
    return sn.docs.map(d => d.data() as License);
  }

  async listPaged(
    companyId?: string,
    term?: string,
    pageSize = 30,
    startAfterDoc?: any
  ): Promise<{ docs: License[]; lastDoc: any }> {
    const col = this.colRef();
    const constraints: QueryConstraint[] = [];

    if (companyId) {
      constraints.push(where('companyId', '==', companyId));
    }

    constraints.push(orderBy('documentNumber'));

    if (term && term.trim().length) {
      const t = term.trim().toUpperCase();
      constraints.push(where('documentNumber', '>=', t));
      constraints.push(where('documentNumber', '<=', t + '\uf8ff'));
    }

    constraints.push(limit(pageSize));

    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }

    const q = query(col, ...constraints);
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => d.data() as License);
    const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
    return { docs, lastDoc };
  }

  async listPagedByFilters(
    filters: {
      companyId?: string;
      unitId?: string;
      documentType?: string;
      status?: string;
    },
    pageSize = 30,
    startAfterDoc?: any
  ): Promise<{ docs: License[]; lastDoc: any }> {
    const col = this.colRef();
    const constraints: QueryConstraint[] = [];

    if (filters.companyId) {
      constraints.push(where('companyId', '==', filters.companyId));
    }

    if (filters.unitId) {
      constraints.push(where('unitId', '==', filters.unitId));
    }

    if (filters.documentType) {
      constraints.push(where('documentType', '==', filters.documentType));
    }

    constraints.push(orderBy('expirationDate'));
    constraints.push(limit(pageSize));

    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }

    const q = query(col, ...constraints);
    const snap = await getDocs(q);
    let docs = snap.docs.map(d => d.data() as License);

    // Filter status in memory (calculated field)
    if (filters.status) {
      docs = docs.filter(d => d.status === filters.status);
    }

    const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
    return { docs, lastDoc };
  }
}
