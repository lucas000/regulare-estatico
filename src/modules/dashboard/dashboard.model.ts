export interface AgendaItem {
  id?: string;
  date: string;
  type: 'Licença' | 'EPI' | 'Condicionante';
  document: string;
  companyName: string;
  status: 'Em dia' | 'A vencer' | 'Vencida' | 'Pendente' | 'Cumprida';
  daysRemaining?: number;
}

export interface DashboardStats {
  licenses: {
    emDia: number;
    aVencer: number;
    vencidas: number;
  };
  conditions: {
    cumpridas: number;
    pendentes: number;
    vencidas: number;
  };
  epis: {
    ok: number;
    aVencer: number;
    vencidas: number;
  };
  agenda: AgendaItem[];
  upcoming: AgendaItem[];
}