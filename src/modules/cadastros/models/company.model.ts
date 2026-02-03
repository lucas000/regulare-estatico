export interface AuditUser {
  uid: string;
  name: string;
  email: string;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  cnpj?: string;
  status?: 'ativo' | 'inativo';
  createdAt: string;
  updatedAt?: string;
  updatedBy?: AuditUser;
  createdBy: AuditUser;
}
