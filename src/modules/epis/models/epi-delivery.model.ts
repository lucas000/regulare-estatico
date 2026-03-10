import { AuditUser } from '../../cadastros/models/company.model';
import { Equipment } from '../../cadastros/models/equipment.model';

export interface EpiDeliveryItem extends Omit<Equipment, 'id'> {
  equipmentId: string;
  quantity: number;
  nextExchangeDate: string; // ISO date string ou yyyy-MM-dd para input date
}

export interface EpiDelivery {
  id: string;
  companyId: string;
  unitId: string;
  sectorId: string;
  employeeId: string;
  employeeName: string;
  cargoId: string;
  cargoName: string;
  cargoCbo: string;
  
  deliveryDate: string; // ISO date string
  items: EpiDeliveryItem[];
  riskIds: string[]; // Riscos marcados no momento da entrega
  
  receiptUrl?: string; // Comprovante opcional
  
  createdAt: string;
  updatedAt: string;
  createdBy: AuditUser;
  updatedBy?: AuditUser;
}
