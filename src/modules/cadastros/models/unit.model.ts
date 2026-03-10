import { AuditUser, CompanyCnae } from './company.model';

export type UnitStatus = 'active' | 'inactive';
export type DocumentType = 'CNPJ' | 'CPF' | 'CAEPF' | 'CNO';

export interface UnitAddress {
  street: string;
  number?: string;
  complement?: string;
  zipCode?: string;
  city: string;
  state: string;
  latitude?: string;
  longitude?: string;
}

export interface Unit {
  id: string;
  companyId: string;
  name: string;

  documentType: DocumentType;
  documentNumber: string;

  cnaeMain: CompanyCnae; // structured object: { id, descricao, observacoes? }
  cnaeSecondary?: CompanyCnae[]; // structured objects

  address: UnitAddress;

  workEnvironmentDescription: string;

  email?: string;
  phone?: string;

  status: UnitStatus;
  notes?: string;

  createdAt: string;
  createdBy: AuditUser;
  updatedAt?: string;
  updatedBy?: AuditUser;

  /** Backward compatibility (old fields) */
  city?: string;
  state?: string;
  latitude?: string;
  longitude?: string;
}
