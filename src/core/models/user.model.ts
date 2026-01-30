export type UserProfile = 'ADMIN' | 'CONSULTOR' | 'CLIENTE';
export type UserStatus = 'ATIVO' | 'INATIVO';

export interface User {
  id: string;
  name: string;
  email: string;
  profile: UserProfile;
  companyId: string;
  status: UserStatus;
}

export const emptyUser: User = {
  id: '',
  name: '',
  email: '',
  profile: 'CLIENTE',
  companyId: '',
  status: 'INATIVO',
};
