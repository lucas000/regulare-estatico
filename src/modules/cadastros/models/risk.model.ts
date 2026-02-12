import {AuditUser} from './company.model';

export type RiskGroup = 'fisico' | 'quimico' | 'biologico' | 'ergonomico' | 'acidente' | 'psicossocial';
export type RiskEvaluationType = 'qualitativa' | 'quantitativa';
export type RiskStatus = 'ativo' | 'inativo';
export type EffectClassification = 'Leve' | 'Moderado' | 'Sério' | 'Severo';
export type Frequency = 'Ocasional' | 'Intermitente' | 'Habitual' | 'Permanente';
export type RiskClassification = 'Aceitável' | 'Tolerável' | 'Não aceitável';
export type InsalubrityLevel = 'Mínimo' | 'Médio' | 'Máximo';
export type SpecialRetirementPeriod = '15 anos' | '20 anos' | '25 anos';

export interface Risk {
    id: string;
    companyId: string;

    name: string;
    riskGroup: RiskGroup;
    description: string;
    generatingSource: string;
    preventiveControlMeasures: string;

    // Tipo de avaliação (qualitativo/quantitativo)
    riskType?: RiskEvaluationType;
    evaluationType?: RiskEvaluationType; // legado, manter para compatibilidade

    // Classificações obrigatórias
    effectClassification?: EffectClassification;
    frequency?: Frequency;
    riskClassification?: RiskClassification;

    // Campos previdenciários
    insalubrity?: 'Sim' | 'Não';
    insalubrityLevel?: InsalubrityLevel;
    dangerousness?: 'Sim' | 'Não';
    specialRetirement?: 'Sim' | 'Não';
    specialRetirementPeriod?: SpecialRetirementPeriod;

    // Campos quantitativos (somente quando riskType = 'quantitativa')
    quantitativeValue?: number;
    toleranceLimit?: number;
    measurementUnit?: string;
    measurementEquipment?: string;
    calibrationCertificateNumber?: string;
    evaluationMethod?: string;

    esocialCode?: string;
    notes?: string;

    status: RiskStatus;

    createdAt: string;
    updatedAt?: string;
    createdBy: AuditUser;
    updatedBy?: AuditUser;
}
