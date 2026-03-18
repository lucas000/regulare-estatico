import { Injectable } from '@angular/core';
import { BaseFirestoreService } from '../../../core/services/base-firestore.service';
import { EpiDelivery } from '../models/epi-delivery.model';
import { getDocs, query, where, orderBy, limit, startAfter, onSnapshot } from '@angular/fire/firestore';
import { Unsubscribe } from 'firebase/firestore';

@Injectable({ providedIn: 'root' })
export class EpiDeliveriesRepository extends BaseFirestoreService<EpiDelivery> {
  protected override collectionPath = 'epi_deliveries';

  listenPaged(
    companyId: string | null,
    employeeId: string | null,
    pageSize: number,
    callback: (res: { docs: EpiDelivery[]; lastDoc: any }) => void
  ): Unsubscribe {
    const col = this.colRef();
    const constraints: any[] = [];

    if (companyId) {
      constraints.push(where('companyId', '==', companyId));
    }
    
    if (employeeId) {
      constraints.push(where('employeeId', '==', employeeId));
    }

    constraints.push(where('deleted', '==', false));
    constraints.push(orderBy('deliveryDate', 'desc'));
    constraints.push(limit(pageSize));

    const qy = query(col, ...constraints);
    return onSnapshot(qy as any, (snap: any) => {
      const docs = snap.docs.map((d: any) => d.data() as EpiDelivery);
      const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
      callback({ docs, lastDoc });
    });
  }

  async listPaged(
    companyId: string | null,
    employeeId: string | null,
    pageSize: number,
    startAfterDoc?: any
  ): Promise<{ docs: EpiDelivery[]; lastDoc: any }> {
    const col = this.colRef();
    const constraints: any[] = [];

    if (companyId) {
      constraints.push(where('companyId', '==', companyId));
    }
    
    if (employeeId) {
      constraints.push(where('employeeId', '==', employeeId));
    }

    // Filtrar apenas se deletado não for explicitamente true
    // Note: Documentos sem o campo 'deleted' serão omitidos por filtros de desigualdade (!=) no Firestore.
    // Por isso adicionamos 'deleted: false' na criação.
    constraints.push(where('deleted', '==', false));

    constraints.push(orderBy('deliveryDate', 'desc'));
    constraints.push(limit(pageSize));

    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }

    const qy = query(col, ...constraints);
    const snap = await getDocs(qy as any);
    const docs = snap.docs.map((d) => d.data() as EpiDelivery);
    const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
    
    return { docs, lastDoc };
  }
}
