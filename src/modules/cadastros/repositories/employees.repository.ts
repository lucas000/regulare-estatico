import { Injectable } from '@angular/core';
import { Employee } from '../models/employee.model';
import { BaseFirestoreService } from '../../../core/services/base-firestore.service';
import { getDocs, query, limit, orderBy, where, startAfter, or } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class EmployeesRepository extends BaseFirestoreService<Employee> {
  protected override collectionPath = 'employees';

  async create(item: Employee): Promise<void> {
    await this.set(item);
  }

  async updateEmployee(id: string, partial: Partial<Employee>): Promise<void> {
    await this.update(id, partial as Partial<Employee>);
  }

  async getById(id: string): Promise<Employee | null> {
    return this.get(id);
  }

  async listByNamePaged(term: string, pageSize: number, startAfterDoc?: any) {
    const col = this.colRef();
    const constraints: any[] = [];
    constraints.push(orderBy('name'));
    if (term && term.trim().length) {
      const t = term.trim();
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

  // simple filter helper for UI filters (not paged): by company/unit/cargo/status
  async listByFilters(filters: { companyId?: string; unitId?: string; cargoId?: string; status?: string }, max = 100) {
    const col = this.colRef();
    const constraints: any[] = [];
    if (filters.companyId) constraints.push(where('companyId', '==', filters.companyId));
    if (filters.unitId) constraints.push(where('unitId', '==', filters.unitId));
    if (filters.cargoId) constraints.push(where('cargoId', '==', filters.cargoId));
    if (filters.status) constraints.push(where('status', '==', filters.status));
    constraints.push(limit(max));
    const q = query(col, ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Employee);
  }
  async listByFieldPrefix(field: keyof Employee | string, term: string, max = 60): Promise<Employee[]> {
    const col = this.colRef();
    const t = (term || '').trim();
    if (!t) return [];
    const constraints: any[] = [orderBy(field as any), where(field as any, '>=', t), where(field as any, '<=', t + '\uf8ff'), limit(max)];
    const qy = query(col, ...constraints);
    const sn = await getDocs(qy as any);
    return sn.docs.map(d => d.data() as Employee);
  }

  async listByFieldEquals(field: keyof Employee | string, value: string, max = 60): Promise<Employee[]> {
    const col = this.colRef();
    if (!value) return [];
    const constraints: any[] = [where(field as any, '==', value), limit(max)];
    const qy = query(col, ...constraints);
    const sn = await getDocs(qy as any);
    return sn.docs.map(d => d.data() as Employee);
  }
}
