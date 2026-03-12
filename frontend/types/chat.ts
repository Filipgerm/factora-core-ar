export type ReportMetric = {
  group: string;
  key: string;
  label: string;
  value: string;
  notes?: string;
  trend?: "up" | "down" | "flat";
};

export type FullReport = {
  title: string;
  asOf: string;
  metrics: ReportMetric[];
};

export type ChartSpec = {
  kind: string;
  title: string;
  data: Array<{
    week: string;
    opening: number;
    inflows: number;
    outflows: number;
    net: number;
    closing: number;
  }>;
  currency: string;
};

export type EntityCard = {
  name: string;
  distinctiveTitle: string;
  gemi: string;
  euid: string;
  vat: string;
  legalForm: string;
  incorporationDate: string;
  address: string;
  website: string;
  eShop: string;
  status: string;
};

export type RiskResults = {
  pdIndex: number; // 1-9 scale
  bandLabel: string; // Very Low ... Very High
  summary: string;
  metrics: Array<{
    label: string;
    value: string;
    trend?: "up" | "down" | "flat";
  }>;
};

export type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  entityCard?: EntityCard;
  riskResults?: RiskResults;
  fullReport?: FullReport;
  chart?: ChartSpec;
  explanationHtml?: string;
};