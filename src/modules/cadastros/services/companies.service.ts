import { Injectable } from '@angular/core';
import { CompaniesRepository } from '../repositories/companies.repository';
import { Company, AuditUser } from '../models/company.model';
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

@Injectable({ providedIn: 'root' })
export class CompaniesService {
  constructor(
    private readonly repo: CompaniesRepository,
    private readonly session: SessionService,
    private readonly usersRepo: UsersRepository
  ) {}

  /**
   * Create company and a CLIENTE user in Firebase Auth + /users in a safe, rollback-capable flow.
   */
  async createCompanyWithClientUser(input: Partial<Company> & { email: string; password?: string }): Promise<string> {
    if (!input.email) throw new Error('Email obrigatório para criar usuário CLIENTE');
    const now = new Date().toISOString();
    const id = `comp_${makeId()}`;

    const loggedUid = this.getUid();
    const loggedUser = await this.usersRepo.get(loggedUid);
    const criadoPor = { uid: loggedUid, nome: loggedUser?.name ?? '', email: loggedUser?.email ?? '' };

    // Prepare company doc
    const company: Company = {
      id,
      nome: input.nome ?? '',
      email: input.email,
      cnpj: input.cnpj ?? '',
      status: 'ativo',
      criadoEm: now,
      atualizadoEm: now,
      criadoPor,
    };

    // Create Auth user using a temporary secondary app to avoid touching current session
    const tempAppName = `temp-${makeId()}`;
    let tempApp: FirebaseApp | null = null;
    let createdUserUid: string | null = null;

    try {
      tempApp = firebaseInitApp(environment.firebase as any, tempAppName);
      const tempAuth = getFirebaseAuth(tempApp);
      const password = input.password ?? DEFAULT_PASSWORD;
      const cred = await firebaseCreateUser(tempAuth, input.email, password);
      createdUserUid = cred.user.uid;

      // Persist user document in /users
      const userDoc = {
        id: createdUserUid,
        name: company.nome,
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
        // swallow rollback error but log
        console.error('Rollback failure deleting auth user', e);
      }
      throw err;
    } finally {
      if (tempApp) {
        try {
          await deleteApp(tempApp);
        } catch (e) {
          // ignore
        }
      }
    }
  }

  async createCompany(input: Partial<Company>): Promise<string> {
    const uid = this.getUid();
    const user = await this.usersRepo.get(uid);
    const audit: AuditUser = { uid, nome: user?.name ?? '', email: user?.email ?? '' };
    const now = new Date().toISOString();
    const id = `comp_${makeId()}`;
    const doc: Company = {
      id,
      nome: input.nome ?? '',
      email: input.email ?? '',
      cnpj: input.cnpj ?? '',
      status: 'ativo',
      criadoEm: now,
      atualizadoEm: now,
      criadoPor: audit,
    };
    await this.repo.create(doc);
    return id;
  }

  async updateCompany(id: string, patch: Partial<Company>): Promise<void> {
    const now = new Date().toISOString();
    // Do not allow overwriting criadoPor/criadoEm
    const uid = this.getUid();
    const user = await this.usersRepo.get(uid);
    const atualizadoPor: AuditUser = { uid, nome: user?.name ?? '', email: user?.email ?? '' };
    await this.repo.updateCompany(id, { ...patch, atualizadoEm: now, atualizadoPor } as Partial<Company>);
  }

  async setActive(id: string, ativo: boolean): Promise<void> {
    await this.repo.updateCompany(id, { status: ativo ? 'ativo' : 'inativo' });
  }

  async listCompanies(): Promise<Company[]> {
    return this.repo.listAll();
  }

  async getCompany(id: string): Promise<Company | null> {
    return this.repo.getById(id);
  }

  private getUid(): string {
    const u = (this.session as any).user?.();
    return u?.id ?? '';
  }
}
