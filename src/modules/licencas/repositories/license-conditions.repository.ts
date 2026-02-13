import { Injectable } from '@angular/core';
import { LicenseCondition } from '../models/license.model';
import { BaseFirestoreService } from '../../../core/services/base-firestore.service';
import { getDocs, query, limit, orderBy, where, startAfter, QueryConstraint } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class LicenseConditionsRepository extends BaseFirestoreService<LicenseCondition> {
  protected override collectionPath = 'licenseConditions';

  async listAll(max = 200): Promise<LicenseCondition[]> {
    const q = query(this.colRef(), limit(max));
    const sn = await getDocs(q as any);
    return sn.docs.map(d => d.data() as LicenseCondition);
  }

  async create(condition: LicenseCondition): Promise<void> {
    await this.set(condition);
  }

  async updateCondition(id: string, partial: Partial<LicenseCondition>): Promise<void> {
    await this.update(id, partial as Partial<LicenseCondition>);
  }

  async getById(id: string): Promise<LicenseCondition | null> {
    return this.get(id);
  }

  async deleteCondition(id: string): Promise<void> {
    return this.delete(id);
  }

  async listByLicense(licenseId: string): Promise<LicenseCondition[]> {
    const q = query(this.colRef(), where('licenseId', '==', licenseId), limit(100));
    const sn = await getDocs(q as any);
    return sn.docs.map(d => d.data() as LicenseCondition);
  }

  async listByCompany(companyId: string, max = 200): Promise<LicenseCondition[]> {
    const q = query(this.colRef(), where('companyId', '==', companyId), limit(max));
    const sn = await getDocs(q as any);
    return sn.docs.map(d => d.data() as LicenseCondition);
  }

  async listPaged(
    licenseId?: string,
    pageSize = 30,
    startAfterDoc?: any
  ): Promise<{ docs: LicenseCondition[]; lastDoc: any }> {
    const col = this.colRef();
    const constraints: QueryConstraint[] = [];

    if (licenseId) {
      constraints.push(where('licenseId', '==', licenseId));
    }

    constraints.push(orderBy('dueDate'));
    constraints.push(limit(pageSize));

    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }

    const q = query(col, ...constraints);
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => d.data() as LicenseCondition);
    const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
    return { docs, lastDoc };
  }
}
