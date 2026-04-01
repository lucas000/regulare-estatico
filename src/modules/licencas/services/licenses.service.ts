import { Injectable, inject } from '@angular/core';
import { LicensesRepository } from '../repositories/licenses.repository';
import { License, AuditUser, calculateLicenseStatus } from '../models/license.model';
import { SessionService } from '../../../core/services/session.service';
import { UsersRepository } from '../../../core/services/users.repository';
import { AlertsService } from '../../alertas/services/alerts.service';
import { CompaniesRepository } from '../../cadastros/repositories/companies.repository';

function makeId(prefix = '') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

@Injectable({ providedIn: 'root' })
export class LicensesService {
  private readonly repo = inject(LicensesRepository);
  private readonly session = inject(SessionService);
  private readonly usersRepo = inject(UsersRepository);
  private readonly alerts = inject(AlertsService);
  private readonly companiesRepo = inject(CompaniesRepository);

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

  private getLicenseAlertDate(license: Partial<License>): string {
    const group = license.documentGroup;
    const type = license.documentType;
    const renewalTypes = [
      'Licença Prévia (LP)',
      'Licença de Instalação (LI)',
      'Licença de Operação (LO)',
      'Renovação da LO'
    ];
    const isEnvironmentalWithRenewal = group === 'Licenciamento Ambiental' && renewalTypes.includes(type ?? '');

    return isEnvironmentalWithRenewal && license.renewalDate 
      ? license.renewalDate 
      : (license.expirationDate ?? '');
  }

  async createLicense(data: Partial<License>): Promise<License> {
    const audit = await this.getAuditUser();
    const id = makeId('lic_');
    const now = new Date().toISOString();

    const license: License = {
      id,
      companyId: data.companyId ?? '',
      unitId: data.unitId ?? '',
      documentGroup: data.documentGroup ?? '',
      documentType: data.documentType ?? '',
      documentNumber: (data.documentNumber ?? '').toUpperCase(),
      issuingAgency: (data.issuingAgency ?? '').toUpperCase(),
      legalBasis: data.legalBasis ?? '',
      periodicity: data.periodicity,
      issueDate: data.issueDate ?? '',
      expirationDate: data.expirationDate ?? '',
      renewalDate: data.renewalDate ?? '',
      status: calculateLicenseStatus(data.expirationDate ?? ''),
      pdfUrl: data.pdfUrl ?? '',
      pdfName: data.pdfName ?? '',
      pdfContentType: data.pdfContentType ?? '',
      notes: data.notes ?? '',
      // Campos do Responsável Técnico (apenas para Programas de SST)
      technicalResponsibleName: data.technicalResponsibleName ?? '',
      technicalResponsibleCpf: data.technicalResponsibleCpf ?? '',
      technicalResponsibleCouncil: data.technicalResponsibleCouncil ?? '',
      technicalResponsibleRegistration: data.technicalResponsibleRegistration ?? '',
      technicalResponsibleArt: data.technicalResponsibleArt ?? '',
      createdAt: now,
      createdBy: audit,
    };

    await this.repo.create(license);
    
    const company = await this.companiesRepo.get(license.companyId);
    await this.alerts.generateAlerts(
      'licenca', 
      license.id, 
      audit.uid, 
      this.getLicenseAlertDate(license),
      {
        companyId: license.companyId,
        companyName: company?.nomeFantasia || company?.razaoSocial || 'N/A',
        documento: `${license.documentType} (${license.documentNumber})`
      }
    );
    return license;
  }

  async updateLicense(id: string, data: Partial<License>): Promise<void> {
    const audit = await this.getAuditUser();
    const now = new Date().toISOString();

    const updateData: Partial<License> = {
      ...data,
      updatedAt: now,
      updatedBy: audit,
    };

    // Recalcular status se necessário
    const current = await this.getById(id);
    if (current) {
      const merged = { ...current, ...data };
      updateData.status = calculateLicenseStatus(this.getLicenseAlertDate(merged));
    }

    // Campos em uppercase
    if (updateData.documentNumber) {
      updateData.documentNumber = updateData.documentNumber.toUpperCase();
    }
    if (updateData.issuingAgency) {
      updateData.issuingAgency = updateData.issuingAgency.toUpperCase();
    }

    await this.repo.updateLicense(id, updateData);

    if (updateData.expirationDate || updateData.renewalDate || updateData.documentType || updateData.documentNumber || updateData.companyId) {
      if (current) {
        // Clear existing alerts for this specific license before regenerating
        await this.alerts.deleteAlertsByOrigin(id);

        const updatedLicense = { ...current, ...updateData };
        const company = await this.companiesRepo.get(updatedLicense.companyId);
        await this.alerts.generateAlerts(
          'licenca', 
          id, 
          audit.uid, 
          this.getLicenseAlertDate(updatedLicense), // Usa a data atualizada do registro
          {
            companyId: updatedLicense.companyId,
            companyName: company?.nomeFantasia || company?.razaoSocial || 'N/A',
            documento: `${updatedLicense.documentType} (${updatedLicense.documentNumber})`
          }
        );
      }
    }
  }

  async toggleStatus(license: License): Promise<void> {
    // Recalcular status baseado na data correta (renovação ou vencimento)
    const alertDate = this.getLicenseAlertDate(license);
    const newStatus = calculateLicenseStatus(alertDate);
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
      const alertDate = this.getLicenseAlertDate(lic);
      const newStatus = calculateLicenseStatus(alertDate);
      if (lic.status !== newStatus) {
        await this.repo.updateLicense(lic.id, { status: newStatus });
      }
    }
  }

  // Exclusão lógica (soft delete)
  async softDelete(id: string): Promise<void> {
    const audit = await this.getAuditUser();
    const now = new Date().toISOString();

    await this.repo.updateLicense(id, {
      deleted: true,
      deletedAt: now,
      deletedBy: audit,
    });
  }

  // Restaurar registro excluído
  async restore(id: string): Promise<void> {
    await this.repo.updateLicense(id, {
      deleted: false,
      deletedAt: undefined,
      deletedBy: undefined,
    });
  }
}
