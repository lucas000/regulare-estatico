import { Injectable, inject } from '@angular/core';
import { EpiDeliveriesRepository } from '../repositories/epi-deliveries.repository';
import { EpiDelivery } from '../models/epi-delivery.model';
import { SessionService } from '../../../core/services/session.service';
import { UsersRepository } from '../../../core/services/users.repository';
import { AuditUser } from '../../cadastros/models/company.model';

function makeId(prefix = '') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

@Injectable({ providedIn: 'root' })
export class EpiDeliveriesService {
  private readonly repo = inject(EpiDeliveriesRepository);
  private readonly session = inject(SessionService);
  private readonly usersRepo = inject(UsersRepository);

  private getUid(): string {
    const u = (this.session as any).user?.();
    return u?.id ?? '';
  }

  private isAdmin(): boolean {
    return this.session.hasRole(['ADMIN'] as any);
  }

  private getLoggedCompanyId(): string {
    const u = (this.session as any).user?.();
    return u?.companyId ?? '';
  }

  async createDelivery(input: Partial<EpiDelivery>): Promise<string> {
    const loggedCompanyId = this.getLoggedCompanyId();
    if (!this.isAdmin()) {
      input.companyId = loggedCompanyId;
    }

    if (!input.companyId) throw new Error('companyId is required');
    if (!input.unitId) throw new Error('unitId is required');
    if (!input.sectorId) throw new Error('sectorId is required');
    if (!input.employeeId) throw new Error('employeeId is required');

    const uid = this.getUid();
    const user = await this.usersRepo.get(uid);
    const audit: AuditUser = { uid, name: user?.name ?? '', email: user?.email ?? '' };
    const now = new Date().toISOString();
    const id = `deliv_${makeId()}`;

    const doc: EpiDelivery = {
      id,
      companyId: input.companyId!,
      unitId: input.unitId!,
      sectorId: input.sectorId!,
      employeeId: input.employeeId!,
      employeeName: input.employeeName!,
      cargoId: input.cargoId!,
      cargoName: input.cargoName!,
      cargoCbo: input.cargoCbo!,
      deliveryDate: input.deliveryDate || now,
      items: input.items || [],
      riskIds: input.riskIds || [],
      receiptUrl: input.receiptUrl,
      createdAt: now,
      updatedAt: now,
      createdBy: audit,
      deleted: false,
    };

    // Remover campos undefined para não quebrar o Firestore
    const safeDoc: any = { ...doc };
    Object.keys(safeDoc).forEach(key => {
      if (safeDoc[key] === undefined) delete safeDoc[key];
    });

    await this.repo.set(safeDoc);
    return id;
  }

  async updateDelivery(id: string, patch: Partial<EpiDelivery>): Promise<void> {
    const uid = this.getUid();
    const user = await this.usersRepo.get(uid);
    const updatedBy: AuditUser = { uid, name: user?.name ?? '', email: user?.email ?? '' };
    const now = new Date().toISOString();

    const safePatch: any = { ...patch, updatedAt: now, updatedBy };
    Object.keys(safePatch).forEach(key => {
      if (safePatch[key] === undefined) delete safePatch[key];
    });

    await this.repo.update(id, safePatch);
  }

  async listDeliveriesPaged(employeeId: string | null, pageSize: number, startAfterDoc?: any) {
    const isAdmin = this.isAdmin();
    const scoped = isAdmin ? (this.session.adminScopeCompanyId() ?? null) : (this.getLoggedCompanyId() || null);

    return this.repo.listPaged(scoped, employeeId, pageSize, startAfterDoc);
  }

  async getDelivery(id: string): Promise<EpiDelivery | null> {
    return this.repo.get(id);
  }

  async deleteDelivery(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
