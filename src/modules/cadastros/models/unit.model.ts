import { AuditUser } from './company.model';

export interface Unit {
  id: string;
  companyId: string;
  nome: string;
  cidade?: string;
  estado?: string;
  status?: 'ativo' | 'inativo';
  criadoEm: string;
  atualizadoEm?: string;
  atualizadoPor?: AuditUser;
  criadoPor: AuditUser;
}
