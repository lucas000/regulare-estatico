import { Injectable } from '@angular/core';
import { EquipmentsRepository } from '../repositories/equipments.repository';
import { Equipment } from '../models/equipment.model';
import { SessionService } from '../../../core/services/session.service';
import { UsersRepository } from '../../../core/services/users.repository';
import { AuditUser } from '../models/company.model';

function makeId(prefix = '') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function toUpperSafe(v: any): string {
  return String(v ?? '').trim().toUpperCase();
}

@Injectable({ providedIn: 'root' })
export class EquipmentsService {
  constructor(
    private readonly repo: EquipmentsRepository,
    private readonly session: SessionService,
    private readonly usersRepo: UsersRepository
  ) {}

  private getUid(): string {
    const u = (this.session as any).user?.();
    return u?.id ?? '';
  }

  private async getAuditUser(): Promise<AuditUser> {
    const uid = this.getUid();
    const user = await this.usersRepo.get(uid);
    return { uid, name: user?.name ?? '', email: user?.email ?? '' };
  }

  async createEquipment(input: Partial<Equipment>): Promise<string> {
    if (!input.name) throw new Error('name is required');
    if (!input.type) throw new Error('type is required');

    const now = new Date().toISOString();
    const id = `equip_${makeId()}`;
    const audit = await this.getAuditUser();

    const hasCert = !!input.hasCertification;
    const certificationNumber = hasCert ? String(input.certificationNumber ?? '').trim() : '';
    const validUntil = hasCert ? String(input.validUntil ?? '').trim() : '';

    if (hasCert && !certificationNumber) {
      throw new Error('Número do CA / Norma é obrigatório');
    }

    const doc: Equipment = {
      id,
      name: toUpperSafe(input.name),
      type: input.type as any,
      hasCertification: hasCert,
      certificationNumber: hasCert ? certificationNumber : '',
      validUntil: hasCert ? validUntil : '',
      notes: String(input.notes ?? ''),
      status: (input.status as any) ?? 'ativo',
      createdAt: now,
      updatedAt: now,
      createdBy: audit,
      updatedBy: audit,
    };

    for (const k of Object.keys(doc as any)) {
      if ((doc as any)[k] === undefined) delete (doc as any)[k];
    }

    await this.repo.create(doc);
    return id;
  }

  async updateEquipment(id: string, patch: Partial<Equipment>): Promise<void> {
    const now = new Date().toISOString();
    const audit = await this.getAuditUser();

    const hasCert = patch.hasCertification !== undefined ? !!patch.hasCertification : undefined;

    const safePatch: any = {
      ...patch,
      ...(patch.name !== undefined ? { name: toUpperSafe(patch.name) } : {}),
      updatedAt: now,
      updatedBy: audit,
    };

    // Regra: se desmarcar certificação, limpa campos
    if (hasCert === false) {
      safePatch.certificationNumber = '';
      safePatch.validUntil = '';
    }

    // Regra: se marcar certificação, exige número
    if (hasCert === true) {
      const cert = String(safePatch.certificationNumber ?? '').trim();
      if (!cert) throw new Error('Número do CA / Norma é obrigatório');
      safePatch.certificationNumber = cert;
      safePatch.validUntil = String(safePatch.validUntil ?? '').trim();
    }

    // não permitir sobrescrever created*
    delete safePatch.createdAt;
    delete safePatch.createdBy;

    for (const k of Object.keys(safePatch)) {
      if (safePatch[k] === undefined) delete safePatch[k];
    }

    await this.repo.updateEquipment(id, safePatch);
  }

  async setActive(id: string, ativo: boolean): Promise<void> {
    await this.updateEquipment(id, { status: ativo ? 'ativo' : 'inativo' });
  }

  async listEquipmentsPaged(filterText: string, pageSize: number, startAfterDoc?: any) {
    return this.repo.listByNamePaged(filterText, pageSize, startAfterDoc);
  }
}
