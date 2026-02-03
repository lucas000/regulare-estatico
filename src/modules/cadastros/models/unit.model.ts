import { AuditUser } from './company.model';

export interface Unit {
  id: string;
  companyId: string;
  name: string;
  city?: string;
  state?: string;
  status?: 'ativo' | 'inativo';
  createdAt: string;
  updatedAt?: string;
  updatedBy?: AuditUser;
  createdBy: AuditUser;
}
