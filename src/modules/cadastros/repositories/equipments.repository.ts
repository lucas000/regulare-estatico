import { Injectable } from '@angular/core';
import { BaseFirestoreService } from '../../../core/services/base-firestore.service';
import { Equipment } from '../models/equipment.model';
import { getDocs, limit, orderBy, query, startAfter, where } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class EquipmentsRepository extends BaseFirestoreService<Equipment> {
  protected override collectionPath = 'equipments';

  async create(equipment: Equipment): Promise<void> {
    await this.set(equipment);
  }

  async updateEquipment(id: string, patch: Partial<Equipment>): Promise<void> {
    await this.update(id, patch);
  }

  async getById(id: string): Promise<Equipment | null> {
    return this.get(id);
  }

  /**
   * Listagem paginada (30 por página) com filtro SOMENTE por nome (server-side), igual ao padrão de Empresas/Riscos.
   * O filtro por tipo (EPI/EPC) é feito exclusivamente em tela.
   */
  async listByNamePaged(filterText: string, pageSize: number, startAfterDoc?: any) {
    const col = this.colRef();
    const constraints: any[] = [orderBy('name')];

    const t = (filterText || '').trim().toUpperCase();
    if (t) {
      constraints.push(where('name', '>=', t));
      constraints.push(where('name', '<=', t + '\uf8ff'));
    }

    constraints.push(limit(pageSize));
    if (startAfterDoc) constraints.push(startAfter(startAfterDoc));

    const qy = query(col, ...constraints);
    const snap = await getDocs(qy as any);
    const docs = snap.docs.map((d) => d.data() as Equipment);
    const lastDoc = snap.docs.at(-1) ?? null;
    return { docs, lastDoc };
  }
}
