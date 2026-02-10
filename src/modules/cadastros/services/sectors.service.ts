import { Injectable } from '@angular/core';
import { SectorsRepository } from '../repositories/sectors.repository';
import { Sector, AuditUser } from '../models/sector.model';
import { SessionService } from '../../../core/services/session.service';
import { UsersRepository } from '../../../core/services/users.repository';

@Injectable({ providedIn: 'root' })
export class SectorsService {
  constructor(
    private readonly repo: SectorsRepository,
    private readonly session: SessionService,
    private readonly usersRepo: UsersRepository
  ) {}

  async createSector(input: Partial<Sector>): Promise<string> {
    const uid = this.getUid();
    const user = await this.usersRepo.get(uid);
    const audit: AuditUser = { uid, name: user?.name ?? '', email: user?.email ?? '' };
    const now = new Date().toISOString();
    const id = `sector_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const doc: Sector = {
      id,
      companyId: input.companyId ?? '',
      unitId: input.unitId ?? '',
      name: input.name ?? '',
      workEnvironmentDescription: input.workEnvironmentDescription ?? '',
      estimatedWorkers: input.estimatedWorkers ?? 0,
      status: input.status ?? 'active',
      notes: input.notes,
      createdAt: now,
      createdBy: audit,
      updatedAt: now,
      updatedBy: audit,
    };
    await this.repo.create(doc);
    return id;
  }

  async updateSector(id: string, patch: Partial<Sector>): Promise<void> {
    const now = new Date().toISOString();
    const uid = this.getUid();
    const user = await this.usersRepo.get(uid);
    const updatedBy: AuditUser = { uid, name: user?.name ?? '', email: user?.email ?? '' };
    await this.repo.updateSector(id, { ...patch, updatedAt: now, updatedBy });
  }

  async setActive(id: string, active: boolean): Promise<void> {
    await this.repo.updateSector(id, { status: active ? 'active' : 'inactive' });
  }

  async getSector(id: string): Promise<Sector | null> {
    return this.repo.getById(id);
  }

  async listSectorsPaged(term: string, pageSize: number, startAfterDoc?: any) {
    return this.repo.listPaged('', '', term, pageSize, startAfterDoc);
  }

  private getUid(): string {
    const u = (this.session as any).user?.();
    return u?.id ?? '';
  }
}
