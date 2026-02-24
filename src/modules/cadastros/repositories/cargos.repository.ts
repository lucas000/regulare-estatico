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

  // Search cargos by name prefix OR CBO prefix. Merges results and limits to `max`.
  async searchByNameOrCbo(term: string, max = 20): Promise<Cargo[]> {
    const t = (term || '').trim();
    if (!t) return [];

    const col = this.colRef();

    // Query by name prefix
    const nameConstraints: any[] = [orderBy('name'), where('name', '>=', t), where('name', '<=', t + '\uf8ff'), limit(max)];
    const qName = query(col, ...nameConstraints);
    const snName = await getDocs(qName as any);
    const byName = snName.docs.map((d) => d.data() as Cargo);

    // Query by CBO prefix (assuming CBO stored as string)
    const cboConstraints: any[] = [orderBy('cbo'), where('cbo', '>=', t), where('cbo', '<=', t + '\uf8ff'), limit(max)];
    const qCbo = query(col, ...cboConstraints);
    const snCbo = await getDocs(qCbo as any);
    const byCbo = snCbo.docs.map((d) => d.data() as Cargo);

    // Merge unique by id, keeping order: name results first, then CBOs
    const map = new Map<string, Cargo>();
    for (const c of [...byName, ...byCbo]) {
      if (!map.has(c.id)) map.set(c.id, c);
      if (map.size >= max) break;
    }
    return Array.from(map.values());
  }

  async findByCbo(cbo: string) {
    const q = query(this.colRef(), where('cbo', '==', cbo), limit(1));
    const sn = await getDocs(q as any);
    return sn.docs.map(d => d.data() as Cargo)[0] ?? null;
  }

  async listAll(max = 200): Promise<Cargo[]> {
    const q = query(this.colRef(), limit(max));
    const sn = await getDocs(q as any);
    return sn.docs.map(d => d.data() as Cargo);
  }

  /** Lista cargos cujo CBO está na lista fornecida */
  async listByCboList(cbos: string[]): Promise<Cargo[]> {
    if (!cbos || cbos.length === 0) return [];

    // Firestore 'in' operator supports up to 30 values per query
    const results: Cargo[] = [];
    const chunks: string[][] = [];

    for (let i = 0; i < cbos.length; i += 30) {
      chunks.push(cbos.slice(i, i + 30));
    }

    for (const chunk of chunks) {
      const q = query(this.colRef(), where('cbo', 'in', chunk));
      const sn = await getDocs(q as any);
      results.push(...sn.docs.map(d => d.data() as Cargo));
    }

    return results;
  }
}
