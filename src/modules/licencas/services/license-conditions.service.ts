import { Injectable, inject } from '@angular/core';
import { LicenseConditionsRepository } from '../repositories/license-conditions.repository';
import { LicenseCondition, AuditUser, calculateConditionStatus } from '../models/license.model';
import { SessionService } from '../../../core/services/session.service';
import { UsersRepository } from '../../../core/services/users.repository';

function makeId(prefix = '') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

@Injectable({ providedIn: 'root' })
export class LicenseConditionsService {
  private readonly repo = inject(LicenseConditionsRepository);
  private readonly session = inject(SessionService);
  private readonly usersRepo = inject(UsersRepository);

  private async getAuditUser(): Promise<AuditUser> {
    const fbUser = this.session.user();
    if (!fbUser) {
      return { uid: 'SISTEMA', name: 'SISTEMA', email: '' };
    }
    const userDoc = await this.usersRepo.getById(fbUser.id);
    return {
      uid: fbUser.id,
      name: userDoc?.name ?? fbUser.name ?? 'Usuário',
      email: userDoc?.email ?? fbUser.email ?? '',
    };
  }

  async createCondition(data: Partial<LicenseCondition>): Promise<LicenseCondition> {
    const audit = await this.getAuditUser();
    const id = makeId('cond_');
    const now = new Date().toISOString();

    const condition: LicenseCondition = {
      id,
      licenseId: data.licenseId ?? '',
      companyId: data.companyId ?? '',
      description: (data.description ?? '').toUpperCase(),
      dueDate: data.dueDate ?? '',
      status: calculateConditionStatus(data.dueDate ?? ''),
      evidenceUrl: data.evidenceUrl ?? '',
      evidenceName: data.evidenceName ?? '',
      evidenceContentType: data.evidenceContentType ?? '',
      evidenceNotes: data.evidenceNotes ?? '',
      createdAt: now,
      createdBy: audit,
    };

    await this.repo.create(condition);
    return condition;
  }

  async updateCondition(id: string, data: Partial<LicenseCondition>): Promise<void> {
    const audit = await this.getAuditUser();
    const now = new Date().toISOString();

    const updateData: Partial<LicenseCondition> = {
      ...data,
      status: calculateConditionStatus(data.dueDate ?? ''),
      updatedAt: now,
      updatedBy: audit,
    };

    if (updateData.description) {
      updateData.description = updateData.description.toUpperCase();
    }

    await this.repo.updateCondition(id, updateData);
  }

  async markAsCumprida(id: string): Promise<void> {
    const audit = await this.getAuditUser();
    const now = new Date().toISOString();
    await this.repo.updateCondition(id, {
      status: 'cumprida',
      updatedAt: now,
      updatedBy: audit,
    });
  }

  async getById(id: string): Promise<LicenseCondition | null> {
    return this.repo.getById(id);
  }

  async listByLicense(licenseId: string): Promise<LicenseCondition[]> {
    return this.repo.listByLicense(licenseId);
  }

  async listByCompany(companyId: string, max = 200): Promise<LicenseCondition[]> {
    return this.repo.listByCompany(companyId, max);
  }

  async delete(id: string): Promise<void> {
    await this.repo.deleteCondition(id);
  }
}
