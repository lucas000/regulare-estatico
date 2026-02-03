import { Injectable } from '@angular/core';
import { Cargo } from '../models/cargo.model';
import { BaseFirestoreService } from '../../../core/services/base-firestore.service';
import { getDocs, query, limit, orderBy, where, startAfter } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class CargosRepository extends BaseFirestoreService<Cargo> {
  protected override collectionPath = 'cargos';

  async create(item: Cargo): Promise<void> {
    return this.set(item);
  }

  async updateCargo(id: string, partial: Partial<Cargo>) {
    return this.update(id, partial as Partial<Cargo>);
  }

  async getById(id: string) {
    return this.get(id);
  }

  async deleteCargo(id: string) {
    return this.delete(id);
  }

  async listByNamePaged(term: string, pageSize: number, startAfterDoc?: any) {
    const col = this.colRef();
    const constraints: any[] = [];
    constraints.push(orderBy('name'));
    if (term && term.trim().length) {
      const t = term.trim();
      // search by name prefix OR cbo prefix: Firestore requires separate queries; we'll implement name prefix
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

  async findByCbo(cbo: string) {
    const q = query(this.colRef(), where('cbo', '==', cbo), limit(1));
    const sn = await getDocs(q as any);
    return sn.docs.map(d => d.data() as Cargo)[0] ?? null;
  }
}
