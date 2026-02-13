export interface AuditUser {
  uid: string;
  name: string;
  email: string;
}

export type LicenseStatus = 'em_dia' | 'a_vencer' | 'vencida';

export interface License {
  id: string;
  companyId: string;
  unitId: string;
  documentType: string;
  documentNumber: string;
  issuingAgency: string;
  issueDate: string; // dd/mm/yyyy
  expirationDate: string; // dd/mm/yyyy
  status: LicenseStatus;
  pdfUrl?: string;
  pdfName?: string; // nome do arquivo PDF armazenado
  pdfContentType?: string; // content-type do arquivo
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: AuditUser;
  updatedBy?: AuditUser;
}

export type ConditionStatus = 'pendente' | 'a_vencer' | 'cumprida' | 'vencida';

export interface LicenseCondition {
  id: string;
  licenseId: string;
  companyId: string;
  description: string;
  dueDate: string; // dd/mm/yyyy
  status: ConditionStatus;
  evidenceUrl?: string;
  evidenceName?: string; // nome do arquivo de evidência armazenado
  evidenceContentType?: string; // content-type do arquivo
  evidenceNotes?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: AuditUser;
  updatedBy?: AuditUser;
}

// Tipos de licença padrão
export const LICENSE_TYPES = [
  'Licença Ambiental',
  'Licença Prévia (LP)',
  'Licença de Instalação (LI)',
  'Licença de Operação (LO)',
  'Autorização Ambiental',
  'Outorga de Água',
  'AVCB',
  'Alvará de Funcionamento',
  'Licença Sanitária',
  'Registro IBAMA',
  'CTF',
  'Outro'
];

// Helper para calcular status da licença
export function calculateLicenseStatus(expirationDate: string, alertDays = 30): LicenseStatus {
  if (!expirationDate) return 'vencida';

  const [day, month, year] = expirationDate.split('/').map(Number);
  if (!day || !month || !year) return 'vencida';

  const expDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'vencida';
  if (diffDays <= alertDays) return 'a_vencer';
  return 'em_dia';
}

// Helper para calcular dias restantes
export function daysUntilExpiration(expirationDate: string): number {
  if (!expirationDate) return -9999;

  const [day, month, year] = expirationDate.split('/').map(Number);
  if (!day || !month || !year) return -9999;

  const expDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Helper para calcular status da condicionante
export function calculateConditionStatus(dueDate: string, alertDays = 15): ConditionStatus {
  if (!dueDate) return 'pendente';

  const [day, month, year] = dueDate.split('/').map(Number);
  if (!day || !month || !year) return 'pendente';

  const due = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'vencida';
  if (diffDays <= alertDays) return 'a_vencer';
  return 'pendente';
}
