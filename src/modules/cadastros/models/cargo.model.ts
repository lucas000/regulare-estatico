import { AuditUser } from './company.model';

export interface Cargo {
  id: string;
  name: string;
  cbo: string;
  description?: string;
  notes?: string;
  status?: 'ativo' | 'inativo';
  createdAt: string;
  updatedAt?: string;
  createdBy: AuditUser;
  updatedBy?: AuditUser;
}
