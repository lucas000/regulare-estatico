import { Injectable } from '@angular/core';
import { UnitsRepository } from '../repositories/units.repository';
import { Unit } from '../models/unit.model';
import { AuditUser } from '../models/company.model';
import { SessionService } from '../../../core/services/session.service';
import { UsersRepository } from '../../../core/services/users.repository';

// lightweight id generator to avoid extra dependency
function makeId(prefix = '') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

@Injectable({ providedIn: 'root' })
export class UnitsService {
  constructor(
    private readonly repo: UnitsRepository,
    private readonly session: SessionService,
    private readonly usersRepo: UsersRepository
  ) {}

  async createUnit(input: Partial<Unit>): Promise<string> {
    const uid = this.getUid();
    const user = await this.usersRepo.get(uid);
    const audit: AuditUser = { uid, name: user?.name ?? '', email: user?.email ?? '' };
    const now = new Date().toISOString();
    const id = `unit_${makeId()}`;
    const doc: Unit = {
      id,
      companyId: input.companyId ?? '',
      name: input.name ?? '',
      city: input.city ??  '',
      state: input.state ??  '',
      status: 'ativo',
      createdAt: now,
      updatedAt: now,
      createdBy: audit,
    };
    await this.repo.create(doc);
    return id;
  }

  async updateUnit(id: string, patch: Partial<Unit>): Promise<void> {
    const now = new Date().toISOString();
    // Do not allow overwriting createdBy/createdAt
    const uid = this.getUid();
    const user = await this.usersRepo.get(uid);
    const updatedBy: AuditUser = { uid, name: user?.name ?? '', email: user?.email ?? '' };
    await this.repo.updateUnit(id, { ...patch, updatedAt: now, updatedBy } as Partial<Unit>);
  }

  async setActive(id: string, ativo: boolean): Promise<void> {
    await this.repo.updateUnit(id, { status: ativo ? 'ativo' : 'inativo' });
  }

  async listByEmpresa(empresaId: string): Promise<Unit[]> {
    if (!empresaId) return this.repo.listAll();
    return this.repo.listBy('companyId' as any, empresaId, 200);
  }

  async getUnit(id: string) {
    return this.repo.getById(id);
  }

  async listUnitsPaged(term: string, pageSize: number, startAfterDoc?: any) {
    return this.repo.listByNamePaged(term, pageSize, startAfterDoc);
  }

  private getUid(): string {
    const u = (this.session as any).user?.();
    return u?.id ?? '';
  }
}
