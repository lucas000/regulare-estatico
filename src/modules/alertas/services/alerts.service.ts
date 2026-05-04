import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, writeBatch, query, where, getDocs, collectionData } from '@angular/fire/firestore';
import { Alert, ALERT_CONFIGS } from '../models/alert.model';
import { Observable } from 'rxjs';

function makeId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

@Injectable({ providedIn: 'root' })
export class AlertsService {
  private readonly firestore = inject(Firestore);
  private readonly collectionName = 'alerts';

  /**
   * Generates and saves alerts for a given entity.
   * If alerts already exist for the entity, they are deleted before recreation.
   */
  async generateAlerts(
    origemTipo: 'licenca' | 'condicionante' | 'epi',
    origemId: string,
    userId: string,
    vencimentoStr: string, // Expected format: 'DD/MM/YYYY' or ISO
    extra: { companyId: string, companyName: string, documento: string },
    configId: string = `default_${origemTipo}`
  ): Promise<void> {
    // 1. Clear existing alerts for this entity
    await this.deleteAlertsByOrigin(origemId);

    // 2. Parse expiration date
    const expirationDate = this.parseDate(vencimentoStr);
    if (isNaN(expirationDate.getTime())) {
      console.warn('Invalid expiration date for alert generation:', vencimentoStr);
      return;
    }

    // 3. Get config
    const config = ALERT_CONFIGS[configId] || ALERT_CONFIGS[`default_${origemTipo}`];
    
    const userEmail = await this.getCompanyEmail(extra.companyName);
    
    // 4. Create new alerts
    const batch = writeBatch(this.firestore);
    const alertsCol = collection(this.firestore, this.collectionName);

    for (const offset of config.offsets) {
      const alertDate = new Date(expirationDate);
      alertDate.setDate(alertDate.getDate() - offset);
      alertDate.setHours(8, 0, 0, 0); // Standard time for firing

      const id = `alert_${makeId()}`;
      const alert: Alert = {
        id,
        origemTipo,
        origemId,
        userId,
        companyId: extra.companyId,
        companyName: extra.companyName,
        userEmail,
        dataBaseVencimento: expirationDate.toISOString(),
        documento: extra.documento,
        dataDisparo: alertDate.toISOString(),
        offsetDias: offset,
        enviado: false,
        createdAt: new Date().toISOString()
      };

      const { id: _, ...alertData } = alert;
      batch.set(doc(alertsCol, id), alertData);
    }

    await batch.commit();
  }

  async deleteAlertsByOrigin(origemId: string): Promise<void> {
    const alertsCol = collection(this.firestore, this.collectionName);
    const q = query(alertsCol, where('origemId', '==', origemId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    const batch = writeBatch(this.firestore);
    snapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }

  async deleteAlertsByOriginPrefix(prefix: string): Promise<void> {
    const alertsCol = collection(this.firestore, this.collectionName);
    // Nota: O Firestore não suporta 'startsWith' nativamente em queries simples de forma performática
    // sem usar >= prefix e < prefix + \uf8ff.
    const q = query(
      alertsCol, 
      where('origemId', '>=', prefix),
      where('origemId', '<=', prefix + '\uf8ff')
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    const batch = writeBatch(this.firestore);
    snapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }

  listAll(): Observable<Alert[]> {
    const alertsCol = collection(this.firestore, this.collectionName);
    return collectionData(alertsCol, { idField: 'id' }) as Observable<Alert[]>;
  }

  listByCompany(companyId: string): Observable<Alert[]> {
    const alertsCol = collection(this.firestore, this.collectionName);
    const q = query(alertsCol, where('companyId', '==', companyId));
    return collectionData(q, { idField: 'id' }) as Observable<Alert[]>;
  }

  private parseDate(dateStr: string): Date {
    if (dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(dateStr);
  }

  private async getCompanyEmail(companyName: string): Promise<string | undefined> {
    const companiesCol = collection(this.firestore, 'companies');
    const q = query(companiesCol, where('razaoSocial', '==', companyName));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Tentar buscar por nomeFantasia se razaoSocial não retornar nada
      const q2 = query(companiesCol, where('nomeFantasia', '==', companyName));
      const snapshot2 = await getDocs(q2);
      if (snapshot2.empty) return undefined;
      return snapshot2.docs[0].data()['institutionalEmail'];
    }

    return snapshot.docs[0].data()['institutionalEmail'];
  }
}