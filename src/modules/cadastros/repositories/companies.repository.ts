import { Injectable } from '@angular/core';
import { Company } from '../models/company.model';
import { BaseFirestoreService } from '../../../core/services/base-firestore.service';
import { getDocs, query, limit } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class CompaniesRepository extends BaseFirestoreService<Company> {
  protected override collectionPath = 'companies';

  async listAll(max = 200): Promise<Company[]> {
    const q = query(this.colRef(), limit(max));
    const sn = await getDocs(q as any);
    return sn.docs.map(d => d.data() as Company);
  }

  async create(company: Company): Promise<void> {
    await this.set(company);
  }

  async updateCompany(id: string, partial: Partial<Company>): Promise<void> {
    await this.update(id, partial as Partial<Company>);
  }

  async getById(id: string): Promise<Company | null> {
    return this.get(id);
  }

  async deleteCompany(id: string): Promise<void> {
    return this.delete(id);
  }
}
