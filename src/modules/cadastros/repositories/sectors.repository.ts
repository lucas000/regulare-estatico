import { Injectable } from '@angular/core';
import { Sector } from '../models/sector.model';
import { BaseFirestoreService } from '../../../core/services/base-firestore.service';
import { getDocs, query, where, orderBy, limit, startAfter } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class SectorsRepository extends BaseFirestoreService<Sector> {
  protected override collectionPath = 'sectors';

  async create(sector: Sector): Promise<void> {
    await this.set(sector);
  }

  async updateSector(sectorId: string, patch: Partial<Sector>): Promise<void> {
    await this.update(sectorId, patch);
  }

  async getById(sectorId: string): Promise<Sector | null> {
    return this.get(sectorId);
  }

  async listPaged(
    companyId: string,
    unitId: string,
    filter: string,
    pageSize: number,
    startAfterDoc?: any
  ): Promise<{ docs: Sector[]; lastDoc: any }> {
    const col = this.colRef();
    const constraints: any[] = [];

    // CLIENTE: filtra por companyId
    if (companyId) constraints.push(where('companyId', '==', companyId));

    constraints.push(orderBy('name'));

    const t = (filter || '').trim();
    if (t) {
      constraints.push(where('name', '>=', t));
      constraints.push(where('name', '<=', t + '\uf8ff'));
    }

    constraints.push(limit(pageSize));
    if (startAfterDoc) constraints.push(startAfter(startAfterDoc));

    const qy = query(col, ...constraints);
    const snap = await getDocs(qy as any);
    const docs = snap.docs.map((d) => d.data() as Sector);
    const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
    return { docs, lastDoc };
  }
}
