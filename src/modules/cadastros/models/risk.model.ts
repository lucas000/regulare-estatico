import { AuditUser } from './company.model';

export type RiskGroup = 'fisico' | 'quimico' | 'biologico' | 'ergonomico' | 'acidente' | 'psicossocial';
export type RiskEvaluationType = 'qualitativa' | 'quantitativa';
export type RiskStatus = 'ativo' | 'inativo';

export interface Risk {
  id: string;
  companyId: string;

  name: string;
  riskGroup: RiskGroup;
  description: string;

  evaluationType: RiskEvaluationType;
  quantitativeValue?: number;
  toleranceLimit?: number;

  esocialCode?: string;

  evaluationMethod?: string;
  measurementUnit?: string;
  measurementEquipment?: string;
  calibrationCertificateNumber?: string;
  notes?: string;

  status: RiskStatus;

  createdAt: string;
  updatedAt?: string;
  createdBy: AuditUser;
  updatedBy?: AuditUser;
}
