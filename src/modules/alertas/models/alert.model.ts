export interface Alert {
  id: string;
  origemTipo: 'licenca' | 'condicionante' | 'epi';
  origemId: string;
  userId: string;
  companyId: string;
  companyName: string;
  dataBaseVencimento: string; // ISO format
  documento: string; // "epi (pessoa)", "tipo (numero)", "descricao"
  dataDisparo: string; // ISO format or similar to be converted to Timestamp if needed
  offsetDias: number;
  enviado: boolean;
  createdAt?: string;
}

export interface AlertConfig {
  id: string;
  offsets: number[]; // e.g., [120, 30, 1, 0]
}

export const ALERT_CONFIGS: Record<string, AlertConfig> = {
  default_licenca: {
    id: 'default_licenca',
    offsets: [30, 15, 7, 1, 0]
  },
  default_condicionante: {
    id: 'default_condicionante',
    offsets: [30, 15, 7, 1, 0]
  },
  default_epi: {
    id: 'default_epi',
    offsets: [30, 15, 7, 1, 0]
  }
};
