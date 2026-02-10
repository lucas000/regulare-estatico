import { AuditUser } from './company.model';

export interface Equipment {
  id: string;

  name: string;
  type: 'EPI' | 'EPC';
  hasCertification: boolean;

  certificationNumber?: string;
  validUntil?: string;
  notes?: string;

  status: 'ativo' | 'inativo';

  createdAt: string;
  updatedAt?: string;
  createdBy: AuditUser;
  updatedBy?: AuditUser;
}
