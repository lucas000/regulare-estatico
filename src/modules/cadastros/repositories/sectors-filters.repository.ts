import { Injectable } from '@angular/core';
import { getDocs, limit, query, where, orderBy } from '@angular/fire/firestore';
import { BaseFirestoreService } from '../../../core/services/base-firestore.service';
import { Sector } from '../models/sector.model';

/**
 * Repositório isolado para consultas de Setores usadas em selects.
 * Mantém o CRUD/paginação de Setores (SectorsRepository) intacto.
 */
@Injectable({ providedIn: 'root' })
export class SectorsFiltersRepository extends BaseFirestoreService<Sector> {
  protected override collectionPath = 'sectors';

  async listByCompanyAndUnit(companyId: string, unitId: string, max = 300): Promise<Sector[]> {
    if (!companyId || !unitId) return [];

    // Consulta simples e previsível para preencher select. Pode exigir índice composto;
    // preferimos NÃO ordenar para reduzir necessidade de índice.
    const qy = query(
      this.colRef() as any,
      where('companyId', '==', companyId),
      where('unitId', '==', unitId),
      limit(max)
    );

    const snap = await getDocs(qy as any);
    return snap.docs.map((d) => d.data() as Sector);
  }
}
