import {Risk} from './risk.model';

// CompanyRisk extends Risk with companyId and sourceRiskId
export interface CompanyRisk extends Risk {
  companyId: string;
  sourceRiskId: string;
}

