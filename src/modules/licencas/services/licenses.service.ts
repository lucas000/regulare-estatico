import { Injectable, inject } from '@angular/core';
import { LicensesRepository } from '../repositories/licenses.repository';
import { License, AuditUser, calculateLicenseStatus } from '../models/license.model';
import { SessionService } from '../../../core/services/session.service';
import { UsersRepository } from '../../../core/services/users.repository';

function makeId(prefix = '') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

@Injectable({ providedIn: 'root' })
export class LicensesService {
  private readonly repo = inject(LicensesRepository);
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

  async createLicense(data: Partial<License>): Promise<License> {
    const audit = await this.getAuditUser();
    const id = makeId('lic_');
    const now = new Date().toISOString();

    const license: License = {
      id,
      companyId: data.companyId ?? '',
      unitId: data.unitId ?? '',
      documentType: data.documentType ?? '',
      documentNumber: (data.documentNumber ?? '').toUpperCase(),
      issuingAgency: (data.issuingAgency ?? '').toUpperCase(),
      issueDate: data.issueDate ?? '',
      expirationDate: data.expirationDate ?? '',
      status: calculateLicenseStatus(data.expirationDate ?? ''),
      pdfUrl: data.pdfUrl ?? '',
      pdfName: data.pdfName ?? '',
      pdfContentType: data.pdfContentType ?? '',
      notes: data.notes ?? '',
      createdAt: now,
      createdBy: audit,
    };

    await this.repo.create(license);
    return license;
  }

  async updateLicense(id: string, data: Partial<License>): Promise<void> {
    const audit = await this.getAuditUser();
    const now = new Date().toISOString();

    const updateData: Partial<License> = {
      ...data,
      status: calculateLicenseStatus(data.expirationDate ?? ''),
      updatedAt: now,
      updatedBy: audit,
    };

    // Campos em uppercase
    if (updateData.documentNumber) {
      updateData.documentNumber = updateData.documentNumber.toUpperCase();
    }
    if (updateData.issuingAgency) {
      updateData.issuingAgency = updateData.issuingAgency.toUpperCase();
    }

    await this.repo.updateLicense(id, updateData);
  }

  async toggleStatus(license: License): Promise<void> {
    // Recalcular status baseado na data de vencimento
    const newStatus = calculateLicenseStatus(license.expirationDate);
    await this.updateLicense(license.id, { status: newStatus });
  }

  async getById(id: string): Promise<License | null> {
    return this.repo.getById(id);
  }

  async listAll(max = 200): Promise<License[]> {
    return this.repo.listAll(max);
  }

  async listByCompany(companyId: string, max = 200): Promise<License[]> {
    return this.repo.listByCompany(companyId, max);
  }

  async listPaged(
    companyId?: string,
    term?: string,
    pageSize = 30,
    startAfterDoc?: any
  ): Promise<{ docs: License[]; lastDoc: any }> {
    return this.repo.listPaged(companyId, term, pageSize, startAfterDoc);
  }

  async listPagedByFilters(
    filters: {
      companyId?: string;
      unitId?: string;
      documentType?: string;
      status?: string;
    },
    pageSize = 30,
    startAfterDoc?: any
  ): Promise<{ docs: License[]; lastDoc: any }> {
    return this.repo.listPagedByFilters(filters, pageSize, startAfterDoc);
  }

  // Recalcular status de todas as licenças (para manutenção)
  async recalculateAllStatuses(): Promise<void> {
    const licenses = await this.repo.listAll(1000);
    for (const lic of licenses) {
      const newStatus = calculateLicenseStatus(lic.expirationDate);
      if (lic.status !== newStatus) {
        await this.repo.updateLicense(lic.id, { status: newStatus });
      }
    }
  }
}
