import { Injectable } from '@angular/core';
import { CargosRepository } from '../repositories/cargos.repository';
import { Cargo } from '../models/cargo.model';
import { AuditUser } from '../models/company.model';
import { SessionService } from '../../../core/services/session.service';
import { UsersRepository } from '../../../core/services/users.repository';

function makeId(prefix = '') { return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`; }

@Injectable({ providedIn: 'root' })
export class CargosService {
  constructor(private readonly repo: CargosRepository, private readonly session: SessionService, private readonly usersRepo: UsersRepository) {}

  private getUid(): string {
    const u = (this.session as any).user?.();
    return u?.id ?? '';
  }

  async createCargo(input: Partial<Cargo>): Promise<string> {
    // validate unique CBO
    if (!input.cbo) throw new Error('CBO é obrigatório');
    const exists = await this.repo.findByCbo(input.cbo);
    if (exists) throw new Error('Já existe um cargo cadastrado com este CBO.');

    const uid = this.getUid();
    const user = await this.usersRepo.get(uid);
    const audit: AuditUser = { uid, name: user?.name ?? '', email: user?.email ?? '' };
    const now = new Date().toISOString();
    const id = `cargo_${makeId()}`;
    const doc: Cargo = {
      id,
      name: input.name ?? '',
      cbo: input.cbo ?? '',
      description: input.description ?? '',
      notes: input.notes ?? '',
      status: input.status ?? 'ativo',
      createdAt: now,
      updatedAt: now,
      createdBy: audit,
    } as Cargo;
    await this.repo.create(doc);
    return id;
  }

  async updateCargo(id: string, patch: Partial<Cargo>): Promise<void> {
    const now = new Date().toISOString();
    const uid = this.getUid();
    const user = await this.usersRepo.get(uid);
    const updatedBy: AuditUser = { uid, name: user?.name ?? '', email: user?.email ?? '' };
    await this.repo.updateCargo(id, { ...patch, updatedAt: now, updatedBy } as Partial<Cargo>);
  }

  async setActive(id: string, ativo: boolean) {
    await this.repo.updateCargo(id, { status: ativo ? 'ativo' : 'inativo' });
  }

  async listCargosPaged(term: string, pageSize: number, startAfterDoc?: any) {
    return this.repo.listByNamePaged(term, pageSize, startAfterDoc);
  }

  async getCargo(id: string) {
    return this.repo.getById(id);
  }
}
