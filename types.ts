
export interface FinancialItem {
  desc: string;
  v25: number;
  v24: number;
  isTotal: boolean;
  isGroup: boolean;
}

export interface KPI {
  name: string;
  v25: string | number;
  v24: string | number;
  description: string;
  unit?: string;
}

export interface DashboardData {
  ativo: FinancialItem[];
  passivo: FinancialItem[];
  kpis: KPI[];
  lastUpdated: string;
}

export type ViewMode = 'COMPARATIVO' | '2025' | '2024';
export type TabMode = 'balanco' | 'indicadores' | 'insights';
