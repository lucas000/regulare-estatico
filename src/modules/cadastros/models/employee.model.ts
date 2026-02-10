import { AuditUser } from './company.model';

export interface Employee {
  id: string;
  companyId: string;
  unitId: string;
  sectorId: string;
  name: string;
  cpf?: string;
  cargoId: string;
  cargoName: string;
  cargoCbo: string;

  // Novos campos
  esocialRegistration: string;
  esocialCategory: string;
  admissionDate: string;

  // Opcionais
  phone?: string;
  email?: string;
  notes?: string;

  status?: 'ativo' | 'inativo';
  createdAt: string;
  updatedAt?: string;
  createdBy: AuditUser;
  updatedBy?: AuditUser;
}
