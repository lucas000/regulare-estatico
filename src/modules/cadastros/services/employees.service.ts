import { Injectable } from '@angular/core';
import { EmployeesRepository } from '../repositories/employees.repository';
import { Employee } from '../models/employee.model';
import { SessionService } from '../../../core/services/session.service';
import { UsersRepository } from '../../../core/services/users.repository';
import { CompaniesRepository } from '../repositories/companies.repository';
import { UnitsRepository } from '../repositories/units.repository';
import { CargosRepository } from '../repositories/cargos.repository';

function makeId(prefix = '') { return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`; }

@Injectable({ providedIn: 'root' })
export class EmployeesService {
  constructor(
    private readonly repo: EmployeesRepository,
    private readonly session: SessionService,
    private readonly usersRepo: UsersRepository,
    private readonly companiesRepo: CompaniesRepository,
    private readonly unitsRepo: UnitsRepository,
    private readonly cargosRepo: CargosRepository,
  ) {}

  private getUid(): string {
    const u = (this.session as any).user?.();
    return u?.id ?? '';
  }

  async createEmployee(input: Partial<Employee>): Promise<string> {
    // validate required fields
    if (!input.companyId) throw new Error('companyId is required');
    if (!input.unitId) throw new Error('unitId is required');
    if (!input.sectorId) throw new Error('sectorId is required');
    if (!input.name) throw new Error('name is required');
    if (!input.cargoId) throw new Error('cargoId is required');

    // new required fields
    if (!input.esocialRegistration) throw new Error('esocialRegistration is required');
    if (!input.esocialCategory) throw new Error('esocialCategory is required');
    if (!input.admissionDate) throw new Error('admissionDate is required');

    const uid = this.getUid();
    const user = await this.usersRepo.get(uid);
    const createdBy = { uid, name: user?.name ?? '', email: user?.email ?? '' };
    const now = new Date().toISOString();
    const id = `emp_${makeId()}`;

    const doc: Employee = {
      id,
      companyId: input.companyId!,
      unitId: input.unitId!,
      sectorId: input.sectorId!,
      name: input.name!,
      cpf: input.cpf ?? '',
      cargoId: input.cargoId!,
      cargoName: input.cargoName ?? input['cargoName'] ?? '',
      cargoCbo: input.cargoCbo ?? input['cargoCbo'] ?? '',

      // new fields
      esocialRegistration: input.esocialRegistration!,
      esocialCategory: input.esocialCategory!,
      admissionDate: input.admissionDate!,

      // optional
      jobDescription: input.jobDescription ?? '',

      // optionals (avoid undefined to keep Firestore happy)
      phone: input.phone ?? '',
      email: input.email ?? '',
      notes: input.notes ?? '',

      status: input.status ?? 'ativo',
      createdAt: now,
      updatedAt: now,
      createdBy,
    } as Employee;

    await this.repo.create(doc);
    return id;
  }

  async updateEmployee(id: string, patch: Partial<Employee>) {
    const uid = this.getUid();
    const user = await this.usersRepo.get(uid);
    const updatedBy = { uid, name: user?.name ?? '', email: user?.email ?? '' };
    const now = new Date().toISOString();

    // Avoid sending undefined to Firestore
    const safePatch: any = { ...patch };
    Object.keys(safePatch).forEach((k) => safePatch[k] === undefined && delete safePatch[k]);

    // Normalize optional new field (avoid undefined)
    if ('jobDescription' in safePatch) {
      safePatch.jobDescription = safePatch.jobDescription ?? '';
    }

    await this.repo.updateEmployee(id, { ...safePatch, updatedAt: now, updatedBy } as Partial<Employee>);
  }

  async setActive(id: string, ativo: boolean) {
    // Reuse update flow to persist updatedAt/updatedBy metadata
    await this.updateEmployee(id, { status: ativo ? 'ativo' : 'inativo' });
  }

  async listEmployeesPaged(term: string, pageSize: number, startAfterDoc?: any) {
    return this.repo.listByNamePaged(term, pageSize, startAfterDoc);
  }

  async getEmployee(id: string) {
    return this.repo.getById(id);
  }

  async listByFilters(filters: { companyId?: string; unitId?: string; cargoId?: string; status?: string }) {
    return this.repo.listByFilters(filters);
  }

  // Aggregated search by employee name, company name, unit name, and cargo (name or CBO)
  async searchAggregated(term: string, max = 300): Promise<Employee[]> {
    const t = (term || '').trim();
    if (!t) return [];

    // Parallel queries
    const [byName, byCargoName, byCargoCbo, companiesRes, unitsRes, cargos] = await Promise.all([
      this.repo.listByFieldPrefix('name', t, Math.min(80, max)),
      this.repo.listByFieldPrefix('cargoName', t, Math.min(80, max)),
      this.repo.listByFieldPrefix('cargoCbo', t, Math.min(80, max)),
      this.companiesRepo.listByNamePaged(t, 20),
      this.unitsRepo.listByNamePaged(t, 20),
      this.cargosRepo.searchByNameOrCbo(t, 20),
    ]);

    const resultMap = new Map<string, Employee>();
    const addAll = (arr: Employee[]) => { for (const e of arr) { if (!resultMap.has(e.id)) resultMap.set(e.id, e); if (resultMap.size >= max) break; } };

    addAll(byName);
    addAll(byCargoName);
    addAll(byCargoCbo);

    // From companies
    const companyIds: string[] = Array.isArray(companiesRes?.docs) ? companiesRes.docs.map((c: any) => c.id).slice(0, 10) : [];
    for (const cid of companyIds) {
      if (resultMap.size >= max) break;
      const list = await this.repo.listByFieldEquals('companyId', cid, 100);
      addAll(list);
      if (resultMap.size >= max) break;
    }

    // From units
    const unitIds: string[] = Array.isArray(unitsRes?.docs) ? unitsRes.docs.map((u: any) => u.id).slice(0, 10) : [];
    for (const uid of unitIds) {
      if (resultMap.size >= max) break;
      const list = await this.repo.listByFieldEquals('unitId', uid, 100);
      addAll(list);
      if (resultMap.size >= max) break;
    }

    // From cargos by id
    const cargoIds: string[] = Array.isArray(cargos) ? cargos.map((cg: any) => cg.id).slice(0, 10) : [];
    for (const cargoId of cargoIds) {
      if (resultMap.size >= max) break;
      const list = await this.repo.listByFieldEquals('cargoId', cargoId, 100);
      addAll(list);
      if (resultMap.size >= max) break;
    }

    return Array.from(resultMap.values()).slice(0, max);
  }
}
