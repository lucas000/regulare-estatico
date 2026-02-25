import { Injectable, inject } from '@angular/core';
import { CompanyRisksRepository } from '../repositories/company-risks.repository';
import { RisksRepository } from '../repositories/risks.repository';
import { CompanyRisk } from '../models/company-risk.model';
import { Risk } from '../models/risk.model';
import { SessionService } from '../../../core/services/session.service';
import { UsersRepository } from '../../../core/services/users.repository';
import { AuditUser } from '../models/company.model';

function makeId(prefix = '') { return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`; }

@Injectable({ providedIn: 'root' })
export class CompanyRisksService {
  private readonly repo = inject(CompanyRisksRepository);
  private readonly genericRepo = inject(RisksRepository);
  private readonly session = inject(SessionService);
  private readonly usersRepo = inject(UsersRepository);

  private getUid(): string {
    const u = (this.session as any).user?.();
    return u?.id ?? '';
  }

  async createFromGeneric(companyId: string, genericRisk: Risk): Promise<string> {
    const uid = this.getUid();
    const user = await this.usersRepo.get(uid);
    const audit: AuditUser = { uid, name: user?.name ?? '', email: user?.email ?? '' };
    const now = new Date().toISOString();
    const id = `crisk_${makeId()}`;

    const doc: CompanyRisk = {
      ...genericRisk,
      id,
      companyId,
      sourceRiskId: genericRisk.id,
      createdAt: now,
      updatedAt: now,
      createdBy: audit,
      updatedBy: audit,
      status: 'ativo'
    } as CompanyRisk;

    await this.repo.create(doc);
    return id;
  }

  async listByCompany(companyId: string): Promise<CompanyRisk[]> {
    return this.repo.listByCompany(companyId);
  }

  async updateRisk(id: string, patch: Partial<CompanyRisk>): Promise<void> {
    const now = new Date().toISOString();
    const uid = this.getUid();
    const user = await this.usersRepo.get(uid);
    const updatedBy: AuditUser = { uid, name: user?.name ?? '', email: user?.email ?? '' };
    await this.repo.updateRisk(id, { ...patch, updatedAt: now, updatedBy });
  }

  async deleteRisk(id: string): Promise<void> {
    await this.repo.deleteRisk(id);
  }

  async searchCompanyRisks(companyId: string, term: string): Promise<CompanyRisk[]> {
    return this.repo.listByCompany(companyId).then(list => {
      if (!term) return list;
      const t = term.trim().toLowerCase();
      return list.filter(r => (r.name || '').toLowerCase().includes(t));
    });
  }

  async createCompanyRisk(companyId: string, input: Partial<CompanyRisk>): Promise<string> {
    const uid = this.getUid();
    const user = await this.usersRepo.get(uid);
    const audit: AuditUser = { uid, name: user?.name ?? '', email: user?.email ?? '' };
    const now = new Date().toISOString();
    const id = `crisk_${makeId()}`;

    const doc: CompanyRisk = {
      id,
      companyId,
      name: String((input as any).name ?? '').toUpperCase(),
      riskGroup: (input as any).riskGroup ?? 'fisico',
      description: (input as any).description ?? '',
      evaluationType: (input as any).evaluationType ?? (input as any).riskType ?? 'qualitativa',
      quantitativeValue: (input as any).quantitativeValue,
      toleranceLimit: (input as any).toleranceLimit,
      measurementUnit: (input as any).measurementUnit,
      measurementEquipment: (input as any).measurementEquipment,
      calibrationCertificateNumber: (input as any).calibrationCertificateNumber,
      esocialCode: (input as any).esocialCode ?? '',
      evaluationMethod: (input as any).evaluationMethod ?? '',
      notes: (input as any).notes ?? '',
      status: (input as any).status ?? 'ativo',
      createdAt: now,
      updatedAt: now,
      createdBy: audit,
      updatedBy: audit,
    } as CompanyRisk;

    // remove undefined
    for (const k of Object.keys(doc)) if ((doc as any)[k] === undefined) delete (doc as any)[k];

    await this.repo.create(doc);
    return id;
  }

  async setActive(id: string, ativo: boolean): Promise<void> {
    await this.updateRisk(id, { status: ativo ? 'ativo' : 'inativo' });
  }
}
