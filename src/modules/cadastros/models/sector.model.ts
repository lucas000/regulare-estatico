export interface AuditUser {
  uid: string;
  name: string;
  email: string;
}

export type SectorStatus = 'active' | 'inactive';

export interface Sector {
  id: string;
  companyId: string;
  unitId: string;
  name: string;
  workEnvironmentDescription: string;
  estimatedWorkers: number;
  status: SectorStatus;
  notes?: string;
  createdAt: string;
  createdBy: AuditUser;
  updatedAt?: string;
  updatedBy?: AuditUser;
}
