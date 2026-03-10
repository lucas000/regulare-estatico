import { Injectable } from '@angular/core';
import { CompanyEquipment } from '../models/company-equipment.model';
import { BaseFirestoreService } from '../../../core/services/base-firestore.service';
import { getDocs, query, limit, orderBy, where, startAfter } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class CompanyEquipmentsRepository extends BaseFirestoreService<CompanyEquipment> {
  protected override collectionPath = 'company_equipments';

  async listByCompany(companyId: string, max = 500): Promise<CompanyEquipment[]> {
    const q = query(this.colRef(), where('companyId', '==', companyId), limit(max));
    const sn = await getDocs(q as any);
    return sn.docs.map(d => d.data() as CompanyEquipment);
  }

  async listByCompanyPaged(companyId: string, term: string, pageSize: number, startAfterDoc?: any) {
    const col = this.colRef();
    const constraints: any[] = [];
    constraints.push(where('companyId', '==', companyId));
    constraints.push(orderBy('name'));
    
    const t = (term || '').trim().toUpperCase();
    if (t) {
      constraints.push(where('name', '>=', t));
      constraints.push(where('name', '<=', t + '\uf8ff'));
    }
    
    constraints.push(limit(pageSize));
    if (startAfterDoc) constraints.push(startAfter(startAfterDoc));
    
    const q = query(col, ...constraints);
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => d.data() as CompanyEquipment);
    const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
    return { docs, lastDoc };
  }

  async create(item: CompanyEquipment): Promise<void> {
    return this.set(item);
  }

  async updateEquipment(id: string, partial: Partial<CompanyEquipment>) {
    return this.update(id, partial as Partial<CompanyEquipment>);
  }

  async deleteEquipment(id: string) {
    return this.delete(id);
  }
}
