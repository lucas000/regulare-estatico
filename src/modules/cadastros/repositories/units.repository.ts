import { Injectable } from '@angular/core';
import { Unit } from '../models/unit.model';
import { BaseFirestoreService } from '../../../core/services/base-firestore.service';
import { getDocs, query, limit } from '@angular/fire/firestore';

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
}
