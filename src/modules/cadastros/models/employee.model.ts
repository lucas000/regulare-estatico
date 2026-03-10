import { AuditUser } from './company.model';

export interface Employee {
  id: string;
  companyId: string;
  unitId: string;
  sectorId: string;
  name: string;
  socialName?: string;
  rg?: string;
  rgIssuingAgency?: string;
  cpf?: string;
  cargoId: string;
  cargoName: string;
  cargoCbo: string;

  // Novos campos obrigatórios
  esocialRegistration: string;
  esocialCategory: string;
  admissionDate: string;
  birthDate: string;
  gender: 'Masculino' | 'Feminino' | 'Não definido';

  // Novos campos opcionais
  nisPis?: string;
  fatherName?: string;
  motherName?: string;

  // Campo opcional (cadastro/edição apenas)
  jobDescription?: string;

  // Endereço
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressZipCode?: string;
  addressUf?: string;
  addressCity?: string;

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
