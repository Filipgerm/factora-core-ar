/** Home dashboard view types (no mock data). */

export type HomeActionUrgency = "default" | "attention" | "critical";

export interface HomeActionItem {
  id: string;
  label: string;
  count: number;
  href: string;
  urgency: HomeActionUrgency;
  aiRelated?: boolean;
}

export interface HomeKpiSparkPoint {
  i: number;
  v: number;
}

export type HomeKpiFormatKey =
  | "eur_millions"
  | "eur_integer"
  | "months_1dp";

export interface HomeKpiMetric {
  id: string;
  title: string;
  tier: "primary" | "secondary";
  animateTarget: number;
  formatKey: HomeKpiFormatKey;
  changePercent: number;
  comparisonLabel: string;
  sparkline: HomeKpiSparkPoint[];
  asOfLabel?: string;
}

export type HomeActivityIcon =
  | "sparkles"
  | "git-merge"
  | "building"
  | "file-text"
  | "mail"
  | "badge-check"
  | "banknote";

export interface HomeActivityItem {
  id: string;
  at: string;
  message: string;
  icon: HomeActivityIcon;
}
