import { AuditUser } from './company.model';

export interface Employee {
  id: string;
  companyId: string;
  unitId: string;
  name: string;
  cpf?: string;
  cargoId: string;
  cargoName: string;
  cargoCbo: string;
  status?: 'ativo' | 'inativo';
  createdAt: string;
  updatedAt?: string;
  createdBy: AuditUser;
  updatedBy?: AuditUser;
}
