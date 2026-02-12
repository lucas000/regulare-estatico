import { AuditUser } from './company.model';

export interface Cargo {
  id: string;
  name: string;
  cbo: string;
  gfip?: string;
  description?: string;
  notes?: string;
  riskIds?: string[];
  status?: 'ativo' | 'inativo';
  createdAt: string;
  updatedAt?: string;
  createdBy: AuditUser;
  updatedBy?: AuditUser;
}
