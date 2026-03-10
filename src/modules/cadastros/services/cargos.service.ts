import { Injectable } from '@angular/core';
import { CargosRepository } from '../repositories/cargos.repository';
import { EmployeesRepository } from '../repositories/employees.repository';
import { Cargo } from '../models/cargo.model';
import { AuditUser } from '../models/company.model';
import { SessionService } from '../../../core/services/session.service';
import { UsersRepository } from '../../../core/services/users.repository';

function makeId(prefix = '') { return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`; }

@Injectable({ providedIn: 'root' })
export class CargosService {
  constructor(
    private readonly repo: CargosRepository,
    private readonly session: SessionService,
    private readonly usersRepo: UsersRepository,
    private readonly employeesRepo: EmployeesRepository
  ) {}

  private getUid(): string {
    const u = (this.session as any).user?.();
    return u?.id ?? '';
  }

  isAdmin(): boolean {
    return this.session.hasRole(['ADMIN'] as any);
  }

  private getLoggedCompanyId(): string {
    const u = (this.session as any).user?.();
    return u?.companyId ?? '';
  }

  /** Verifica se o usuário é CLIENTE (somente visualização de cargos) */
  isCliente(): boolean {
    return this.session.hasRole(['CLIENTE'] as any);
  }

  /** Retorna o companyId selecionado pelo ADMIN (ou null se visão geral) */
  getAdminScopeCompanyId(): string | null {
    return this.session.adminScopeCompanyId();
  }

  /** Verifica se ADMIN tem uma empresa selecionada (não está na visão geral) */
  hasAdminScopeCompany(): boolean {
    return this.isAdmin() && !!this.session.adminScopeCompanyId();
  }

  /** Lista cargos para CLIENTE - baseado nos funcionários da empresa */
  async listCargosForCliente(): Promise<Cargo[]> {
    const companyId = this.getLoggedCompanyId();
    return this.listCargosByCompanyEmployees(companyId);
  }

  /** Lista cargos para ADMIN com empresa selecionada - baseado nos funcionários */
  async listCargosForAdminScope(): Promise<Cargo[]> {
    const companyId = this.session.adminScopeCompanyId();
    if (!companyId) return [];
    return this.listCargosByCompanyEmployees(companyId);
  }

  /** Método interno para listar cargos baseado nos funcionários de uma empresa */
  private async listCargosByCompanyEmployees(companyId: string | null): Promise<Cargo[]> {
    if (!companyId) return [];

    // 1. Buscar todos os funcionários da empresa
    const employees = await this.employeesRepo.listByCompanyId(companyId);

    // 2. Extrair CBOs únicos dos funcionários
    const uniqueCbos = [...new Set(employees.map(e => e.cargoCbo).filter(cbo => !!cbo))];

    if (uniqueCbos.length === 0) return [];

    // 3. Buscar cargos correspondentes aos CBOs
    const cargos = await this.repo.listByCboList(uniqueCbos);

    return cargos;
  }

  async createCargo(input: Partial<Cargo>): Promise<string> {
    // validate unique CBO
    if (!input.cbo) throw new Error('CBO é obrigatório');
    // const exists = await this.repo.findByCbo(input.cbo);
    // if (exists) throw new Error('Já existe um cargo cadastrado com este CBO.');

    const uid = this.getUid();
    const user = await this.usersRepo.get(uid);
    const audit: AuditUser = { uid, name: user?.name ?? '', email: user?.email ?? '' };
    const now = new Date().toISOString();
    const id = `cargo_${makeId()}`;
    const doc: Cargo = {
      id,
      name: input.name ?? '',
      cbo: input.cbo ?? '',
      gfip: input.gfip ?? '',
      description: input.description ?? '',
      notes: input.notes ?? '',
      riskIds: input.riskIds ?? [],
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
