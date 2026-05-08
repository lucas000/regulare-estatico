import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { Firestore, collection, query, where, orderBy, limit, onSnapshot, Timestamp, Unsubscribe } from '@angular/fire/firestore';
import { SessionService } from './session.service';

export interface AlertNotification {
  id: string;
  documento: string;
  origemTipo: string;
  companyName: string;
  enviadoEm: Timestamp;
  userId: string;
  companyId: string;
  origemId: string;
}

@Injectable({ providedIn: 'root' })
export class AlertsService {
  private readonly firestore = inject(Firestore);
  private readonly session = inject(SessionService);

  private readonly _alerts = signal<AlertNotification[]>([]);
  public readonly alerts = this._alerts.asReadonly();
  public readonly count = computed(() => this._alerts().length);

  constructor() {
    // Reinicia o listener sempre que o usuário ou o escopo de admin mudar
    effect((onCleanup) => {
      const user = this.session.user();
      let unsubscribe: Unsubscribe | null = null;

      if (!user) {
        this._alerts.set([]);
        return;
      }
      
      unsubscribe = this.initListener(user);

      onCleanup(() => {
        if (unsubscribe) unsubscribe();
      });
    });
  }

  private initListener(user: any) {
    const alertsCol = collection(this.firestore, 'alerts');
    const isAdmin = this.session.hasRole(['ADMIN']);
    const scopeId = this.session.adminScopeCompanyId();
    
    // Construímos a query de forma mais inteligente
    let constraints: any[] = [
      where('enviado', '==', true),
      orderBy('enviadoEm', 'desc'),
      limit(100) // Aumentamos o limite para garantir que o filtro client-side encontre os registros
    ];

    // Se não for admin, filtramos por empresa já no servidor para evitar lixo
    if (!isAdmin && user.companyId) {
      constraints.unshift(where('companyId', '==', user.companyId));
    } 
    // Se for admin com escopo, também filtramos no servidor
    else if (isAdmin && scopeId) {
      constraints.unshift(where('companyId', '==', scopeId));
    }

    const q = query(alertsCol, ...constraints);

    return onSnapshot(q, 
      (snapshot) => {
        const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AlertNotification));
      
        const filtered = all.filter(a => {
          if (isAdmin) {
            return scopeId ? a.companyId === scopeId : true;
          }
          return a.companyId === user.companyId || a.userId === user.id;
        });

        this._alerts.set(filtered);
      },
      (error) => {
        console.error('[AlertsService] Erro crítico no Firestore. Se for erro de INDEX, clique no link abaixo:', error);
      }
    );
  }
}