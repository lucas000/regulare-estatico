export interface AuditUser {
  uid: string;
  nome: string;
  email: string;
}

export interface Company {
  id: string;
  nome: string;
  email: string;
  cnpj?: string;
  status?: 'ativo' | 'inativo';
  criadoEm: string;
  atualizadoEm?: string;
  atualizadoPor?: AuditUser;
  criadoPor: AuditUser;
}
