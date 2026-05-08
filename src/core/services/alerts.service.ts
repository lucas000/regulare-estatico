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
    
    // Busca os últimos 20 alertas enviados
    const q = query(
      alertsCol,
      where('enviado', '==', true),
      orderBy('enviadoEm', 'desc'),
      limit(20)
    );

    return onSnapshot(q, 
      (snapshot) => {
        const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AlertNotification));
        console.log('[AlertsService] Notificações brutas do Firestore:', all.length);
      
        const filtered = all.filter(a => {
          const isAdmin = this.session.hasRole(['ADMIN']);
          const scopeId = this.session.adminScopeCompanyId();

          if (isAdmin) {
            return scopeId ? a.companyId === scopeId : true;
          }
          return a.companyId === user.companyId || a.userId === user.id;
        });

        console.log('[AlertsService] Notificações após filtro de segurança:', filtered.length);
        this._alerts.set(filtered);
      },
      (error) => {
        console.error('[AlertsService] Erro no listener de notificações:', error);
        // Se houver erro de índice, o Firestore enviará um link no log do console para criá-lo automaticamente
      }
    );
  }
}