import { Equipment } from './equipment.model';

export interface CompanyEquipment extends Equipment {
  companyId: string;
  sourceEquipmentId: string; // id do equipamento genérico copiado
}
