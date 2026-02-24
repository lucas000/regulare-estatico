import { AuditUser } from './company.model';

export interface Equipment {
  id: string;

  name: string;
  type: 'EPI' | 'EPC';
  manufacturer?: string;
  hasCertification: boolean;

  certificationNumber?: string;
  validUntil?: string;

  // Campos específicos EPI
  epiExpirationDate?: string;
  epiSize?: '' | 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XG' | 'Único';

  // Campos específicos EPC
  reportNumber?: string;
  maintenanceCertificateNumber?: string;

  notes?: string;

  status: 'ativo' | 'inativo';

  createdAt: string;
  updatedAt?: string;
  createdBy: AuditUser;
  updatedBy?: AuditUser;
}
