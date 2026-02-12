import { Injectable } from '@angular/core';
import { CompaniesRepository } from '../repositories/companies.repository';
import { Company, AuditUser, CompanyCnae } from '../models/company.model';
import { SessionService } from '../../../core/services/session.service';
import { UsersRepository } from '../../../core/services/users.repository';
import { initializeApp as firebaseInitApp, deleteApp, FirebaseApp } from 'firebase/app';
import { getAuth as getFirebaseAuth, createUserWithEmailAndPassword as firebaseCreateUser, deleteUser as firebaseDeleteUser } from 'firebase/auth';
import { environment } from '../../../environments/environment';

// Default temporary password used when not provided in the form
export const DEFAULT_PASSWORD = '@Sysmvn2026';

// lightweight id generator to avoid extra dependency
function makeId(prefix = '') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeCnae(input: any): CompanyCnae {
  if (!input) return { id: '', descricao: '', observacoes: [] };
  if (typeof input === 'string') {
    // legacy: was a text field
    return { id: input, descricao: input, observacoes: [] };
  }
  return {
    id: String(input.id ?? ''),
    descricao: String(input.descricao ?? input.description ?? ''),
    observacoes: Array.isArray(input.observacoes) ? input.observacoes : [],
  };
}

function normalizeCnaeArray(input: any): CompanyCnae[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(normalizeCnae).filter((c) => !!(c.id || c.descricao));
  // legacy: string[] from textarea (one per line)
  if (typeof input === 'string') {
    return input
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => ({ id: s, descricao: s, observacoes: [] }));
  }
  return [];
}

@Injectable({ providedIn: 'root' })
export class CompaniesService {
  constructor(
    private readonly repo: CompaniesRepository,
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

  /**
   * Create company and a CLIENTE user in Firebase Auth + /users in a safe, rollback-capable flow.
   */
  async createCompanyWithClientUser(input: Partial<Company> & { email: string; password?: string }): Promise<string> {
    // CLIENTE não pode criar empresas
    if (!this.isAdmin()) {
      throw new Error('Apenas ADMIN pode criar novas empresas.');
    }

    if (!input.email) throw new Error('Email obrigatório para criar usuário CLIENTE');

    const now = new Date().toISOString();
    const id = `comp_${makeId()}`;

    const loggedUid = this.getUid();
    const loggedUser = await this.usersRepo.get(loggedUid);
    const createdBy = { uid: loggedUid, name: loggedUser?.name ?? '', email: loggedUser?.email ?? '' };

    const company: Company = {
      id,
      status: 'ativo',
      email: input.email,
      createdAt: now,
      updatedAt: now,
      createdBy,

      // New required fields
      razaoSocial: input.razaoSocial ?? input.name ?? '',
      nomeFantasia: input.nomeFantasia ?? '',
      personType: (input.personType as any) ?? 'PJ',
      document: input.document ?? input.cnpj ?? '',
      caepf: input.caepf,
      cno: input.cno,
      legalResponsibleName: input.legalResponsibleName ?? '',
      legalResponsibleCpf: input.legalResponsibleCpf ?? '',
      addressStreet: input.addressStreet ?? '',
      addressUf: input.addressUf ?? '',
      addressCity: input.addressCity ?? '',
      companyType: (input.companyType as any) ?? 'Outro',
      cnaeMain: normalizeCnae((input as any).cnaeMain),
      cnaeSecondary: normalizeCnaeArray((input as any).cnaeSecondary),
      workEnvironmentDescription: input.workEnvironmentDescription ?? '',
      institutionalEmail: input.institutionalEmail ?? input.email,
      phoneWhatsapp: input.phoneWhatsapp ?? '',
      notes: input.notes,

      // Legacy fields
      name: input.name ?? input.razaoSocial ?? '',
      cnpj: input.cnpj ?? input.document ?? '',
    };

    // Create Auth user using a temporary secondary app to avoid touching current session
    const tempAppName = `temp-${makeId()}`;
    let tempApp: FirebaseApp | null = null;
    let createdUserUid: string | null = null;

    try {
      tempApp = firebaseInitApp(environment.firebase as any, tempAppName);
      const tempAuth = getFirebaseAuth(tempApp);
      const password = input.password && input.password.trim().length > 0 ? input.password : DEFAULT_PASSWORD;
      const cred = await firebaseCreateUser(tempAuth, input.email, password);
      createdUserUid = cred.user.uid;

      // Persist user document in /users
      const userDoc = {
        id: createdUserUid,
        name: company.razaoSocial || company.name || '',
        email: input.email,
        profile: 'CLIENTE' as const,
        companyId: id,
        status: 'ATIVO' as const,
        createdAt: now,
        createdBy: loggedUid,
      };

      await this.usersRepo.set(userDoc as any);

      // Persist company document
      await this.repo.create(company);

      return id;
    } catch (err) {
      // Rollback: if user created in Auth, try to delete it
      try {
        if (createdUserUid && tempApp) {
          const tempAuth = getFirebaseAuth(tempApp);
          const u = tempAuth.currentUser;
          if (u) {
            await firebaseDeleteUser(u);
          }
        }
      } catch (e) {
        console.error('Rollback failure deleting auth user', e);
      }
      throw err;
    } finally {
      if (tempApp) {
        try {
          await deleteApp(tempApp);
        } catch {
          // ignore
        }
      }
    }
  }

  async createCompany(input: Partial<Company>): Promise<string> {
    if (!this.isAdmin()) {
      throw new Error('Apenas ADMIN pode criar novas empresas.');
    }

    const uid = this.getUid();
    const user = await this.usersRepo.get(uid);
    const audit: AuditUser = { uid, name: user?.name ?? '', email: user?.email ?? '' };
    const now = new Date().toISOString();
    const id = `comp_${makeId()}`;

    const doc: Company = {
      id,
      status: 'ativo',
      email: input.email ?? '',
      createdAt: now,
      updatedAt: now,
      createdBy: audit,

      razaoSocial: input.razaoSocial ?? input.name ?? '',
      nomeFantasia: input.nomeFantasia ?? '',
      personType: (input.personType as any) ?? 'PJ',
      document: input.document ?? input.cnpj ?? '',
      caepf: input.caepf,
      cno: input.cno,
      legalResponsibleName: input.legalResponsibleName ?? '',
      legalResponsibleCpf: input.legalResponsibleCpf ?? '',
      addressStreet: input.addressStreet ?? '',
      addressUf: input.addressUf ?? '',
      addressCity: input.addressCity ?? '',
      companyType: (input.companyType as any) ?? 'Outro',
      cnaeMain: normalizeCnae((input as any).cnaeMain),
      cnaeSecondary: normalizeCnaeArray((input as any).cnaeSecondary),
      workEnvironmentDescription: input.workEnvironmentDescription ?? '',
      institutionalEmail: input.institutionalEmail ?? input.email ?? '',
      phoneWhatsapp: input.phoneWhatsapp ?? '',
      notes: input.notes,

      name: input.name ?? input.razaoSocial ?? '',
      cnpj: input.cnpj ?? input.document ?? '',
    };

    await this.repo.create(doc);
    return id;
  }

  async updateCompany(id: string, patch: Partial<Company>): Promise<void> {
    // CLIENTE só pode editar a própria empresa
    if (!this.isAdmin()) {
      const myCompanyId = this.getLoggedCompanyId();
      if (!myCompanyId || id !== myCompanyId) {
        throw new Error('Sem permissão para editar esta empresa.');
      }
    }

    const now = new Date().toISOString();
    const uid = this.getUid();
    const user = await this.usersRepo.get(uid);
    const updatedBy: AuditUser = { uid, name: user?.name ?? '', email: user?.email ?? '' };

    const safePatch: Partial<Company> = {
      ...patch,
      updatedAt: now,
      updatedBy,
    };

    // Normalize CNAE patches, because dialog returns structured objects
    if ((safePatch as any).cnaeMain) {
      (safePatch as any).cnaeMain = normalizeCnae((safePatch as any).cnaeMain);
    }
    if ((safePatch as any).cnaeSecondary) {
      (safePatch as any).cnaeSecondary = normalizeCnaeArray((safePatch as any).cnaeSecondary);
    }

    // Keep legacy fields in sync when new fields are changed
    if (safePatch.razaoSocial && !safePatch.name) safePatch.name = safePatch.razaoSocial;
    if (safePatch.document && !safePatch.cnpj) safePatch.cnpj = safePatch.document;

    await this.repo.updateCompany(id, safePatch);
  }

  async setActive(id: string, ativo: boolean): Promise<void> {
    // Apenas ADMIN pode ativar/inativar empresa
    if (!this.isAdmin()) {
      throw new Error('Apenas ADMIN pode ativar/inativar empresas.');
    }
    await this.repo.updateCompany(id, { status: ativo ? 'ativo' : 'inativo' });
  }

  async listCompaniesPaged(term: string, pageSize: number, startAfterDoc?: any) {
    // CLIENTE: listar somente a própria empresa
    if (!this.isAdmin()) {
      const myCompanyId = this.getLoggedCompanyId();
      if (!myCompanyId) return { docs: [], lastDoc: null };
      const c = await this.repo.getById(myCompanyId);
      return { docs: c ? [c] : [], lastDoc: null };
    }
    return this.repo.listByNamePaged(term, pageSize, startAfterDoc);
  }

  async listCompanies(): Promise<Company[]> {
    if (!this.isAdmin()) {
      const myCompanyId = this.getLoggedCompanyId();
      const c = myCompanyId ? await this.repo.getById(myCompanyId) : null;
      return c ? [c] : [];
    }
    return this.repo.listAll();
  }

  async getCompany(id: string): Promise<Company | null> {
    if (!this.isAdmin()) {
      const myCompanyId = this.getLoggedCompanyId();
      if (!myCompanyId || id !== myCompanyId) return null;
    }
    return this.repo.getById(id);
  }

  private getUid(): string {
    const u = (this.session as any).user?.();
    return u?.id ?? '';
  }
}
