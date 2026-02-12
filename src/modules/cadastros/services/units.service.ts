import { Injectable } from '@angular/core';
import { UnitsRepository } from '../repositories/units.repository';
import { Unit } from '../models/unit.model';
import { AuditUser, CompanyCnae } from '../models/company.model';
import { SessionService } from '../../../core/services/session.service';
import { UsersRepository } from '../../../core/services/users.repository';

// lightweight id generator to avoid extra dependency
function makeId(prefix = '') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeCnae(input: any): CompanyCnae {
  if (!input) return { id: '', descricao: '', observacoes: [] } as CompanyCnae;
  if (typeof input === 'string') return { id: input, descricao: input, observacoes: [] } as CompanyCnae;
  return {
    id: String(input.id ?? ''),
    descricao: String(input.descricao ?? input.description ?? ''),
    observacoes: Array.isArray(input.observacoes) ? input.observacoes : [],
  } as CompanyCnae;
}

function normalizeCnaeArray(input: any): CompanyCnae[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(normalizeCnae).filter((c) => !!(c.id || c.descricao));
  if (typeof input === 'string') {
    return input
      .split(/\r?\n|,/) // suporta separado por linha ou vírgula
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => ({ id: s, descricao: s, observacoes: [] } as CompanyCnae));
  }
  return [];
}

@Injectable({ providedIn: 'root' })
export class UnitsService {
  constructor(
    private readonly repo: UnitsRepository,
    private readonly session: SessionService,
    private readonly usersRepo: UsersRepository
  ) {}

  private isAdmin(): boolean {
    return this.session.hasRole(['ADMIN'] as any);
  }

  private getLoggedCompanyId(): string {
    const u = (this.session as any).user?.();
    return u?.companyId ?? '';
  }

  async createUnit(input: Partial<Unit>): Promise<string> {
    const loggedCompanyId = this.getLoggedCompanyId();
    // CLIENTE: sempre persistir companyId do usuário logado
    if (!this.isAdmin()) {
      (input as any).companyId = loggedCompanyId;
    }

    const uid = this.getUid();
    const user = await this.usersRepo.get(uid);
    const audit: AuditUser = { uid, name: user?.name ?? '', email: user?.email ?? '' };
    const now = new Date().toISOString();
    const id = `unit_${makeId()}`;

    const city = input.address?.city ?? (input as any).city ?? '';
    const state = input.address?.state ?? (input as any).state ?? '';

    const email = (input as any).email;
    const phone = (input as any).phone;

    const doc: Unit = {
      id,
      companyId: (this.isAdmin() ? (input.companyId ?? '') : (loggedCompanyId ?? '')),
      name: input.name ?? '',

      documentType: (input.documentType ?? 'CNPJ') as any,
      documentNumber: input.documentNumber ?? '',

      // Persist structured CNAE objects
      cnaeMain: normalizeCnae((input as any).cnaeMain),
      cnaeSecondary: normalizeCnaeArray((input as any).cnaeSecondary),

      address: {
        street: input.address?.street ?? (input as any).street ?? '',
        city,
        state,
      },

      workEnvironmentDescription: input.workEnvironmentDescription ?? '',
      email: email ? email : (undefined as any),
      phone: phone ? phone : (undefined as any),

      status: (input.status ?? 'active') as any,
      notes: (input as any).notes,

      createdAt: now,
      updatedAt: now,
      createdBy: audit,
      updatedBy: audit,

      // backward compatibility
      city,
      state,
    } as any;

    // Remove campos undefined (Firestore não aceita)
    Object.keys(doc as any).forEach((k) => ((doc as any)[k] === undefined ? delete (doc as any)[k] : null));

    await this.repo.create(doc);
    return id;
  }

  async updateUnit(id: string, patch: Partial<Unit>): Promise<void> {
    const loggedCompanyId = this.getLoggedCompanyId();

    // CLIENTE: não permite alterar companyId e sempre persistir o companyId do usuário
    if (!this.isAdmin()) {
      delete (patch as any).companyId;
      (patch as any).companyId = loggedCompanyId;
    }

    const now = new Date().toISOString();
    const uid = this.getUid();
    const user = await this.usersRepo.get(uid);
    const updatedBy: AuditUser = { uid, name: user?.name ?? '', email: user?.email ?? '' };

    // Normaliza address/city/state para manter compatibilidade
    const city = patch.address?.city ?? (patch as any).city;
    const state = patch.address?.state ?? (patch as any).state;

    const normalized: Partial<Unit> = {
      ...patch,
      // normalize CNAEs if present in patch
      ...(patch as any).cnaeMain !== undefined ? { cnaeMain: normalizeCnae((patch as any).cnaeMain) } : {},
      ...(patch as any).cnaeSecondary !== undefined ? { cnaeSecondary: normalizeCnaeArray((patch as any).cnaeSecondary) } : {},
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
      ...(patch.address || city || state
        ? {
            address: {
              street: patch.address?.street ?? (patch as any).street ?? '',
              city: city ?? '',
              state: state ?? '',
            },
          }
        : {}),
      updatedAt: now,
      updatedBy,
    } as any;

    // Do not allow overwriting createdBy/createdAt
    delete (normalized as any).createdAt;
    delete (normalized as any).createdBy;

    // Remove campos undefined (Firestore não aceita)
    Object.keys(normalized as any).forEach((k) => ((normalized as any)[k] === undefined ? delete (normalized as any)[k] : null));

    await this.repo.updateUnit(id, normalized as Partial<Unit>);
  }

  async setActive(id: string, ativo: boolean): Promise<void> {
    await this.repo.updateUnit(id, { status: ativo ? 'active' : 'inactive' } as any);
  }

  async listByEmpresa(empresaId: string): Promise<Unit[]> {
    if (!empresaId) return this.repo.listAll();
    return this.repo.listBy('companyId' as any, empresaId, 200);
  }

  async getUnit(id: string) {
    return this.repo.getById(id);
  }

  async listUnitsPaged(term: string, pageSize: number, startAfterDoc?: any) {
    // CLIENTE: filtrar por companyId no backend e bloquear quando não houver vínculo
    if (!this.isAdmin()) {
      const cid = this.getLoggedCompanyId();
      if (!cid) {
        // Sem empresa vinculada: não listar nada para CLIENTE
        return { docs: [], lastDoc: null } as any;
      }
      return this.repo.listByNamePaged(cid as any, term, pageSize, startAfterDoc);
    }
    // ADMIN: se houver escopo selecionado, aplica; senão, todas
    const scoped = (this.session as any).adminScopeCompanyId?.() ?? null;
    return this.repo.listByNamePaged((scoped || null) as any, term, pageSize, startAfterDoc);
  }

  private getUid(): string {
    const u = (this.session as any).user?.();
    return u?.id ?? '';
  }
}
