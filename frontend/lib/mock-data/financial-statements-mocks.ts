import type { HomeKpiSparkPoint } from "@/lib/mock-data/dashboard-mocks";

/** IFRS-style display: negatives in parentheses. */
export function formatStatementEUR(value: number): string {
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs);
  if (value < 0) return `(${formatted})`;
  return formatted;
}

export type IncomeRowKind =
  | "section"
  | "line"
  | "subtotal"
  | "total"
  | "highlight";

export interface IncomeStatementRow {
  id: string;
  label: string;
  kind: IncomeRowKind;
  currentMonth: number;
  ytd: number;
  /** Keys align with `INCOME_MOM_PERIOD_KEYS` */
  valuesByPeriod?: Record<string, number>;
}

export const INCOME_MOM_PERIOD_KEYS = ["2024-09", "2024-10", "2024-11"] as const;

export const INCOME_MOM_PERIOD_LABELS: Record<
  (typeof INCOME_MOM_PERIOD_KEYS)[number],
  string
> = {
  "2024-09": "Sep 2024",
  "2024-10": "Oct 2024",
  "2024-11": "Nov 2024",
};

export const INCOME_STATEMENT_ROWS: IncomeStatementRow[] = [
  { id: "rev-h", label: "Revenue", kind: "section", currentMonth: 0, ytd: 0 },
  {
    id: "rev-sub",
    label: "Software subscriptions",
    kind: "line",
    currentMonth: 42_800,
    ytd: 412_500,
    valuesByPeriod: { "2024-09": 38_200, "2024-10": 40_100, "2024-11": 42_800 },
  },
  {
    id: "rev-pro",
    label: "Professional services",
    kind: "line",
    currentMonth: 12_400,
    ytd: 108_200,
    valuesByPeriod: { "2024-09": 11_000, "2024-10": 11_800, "2024-11": 12_400 },
  },
  {
    id: "rev-tot",
    label: "Total revenue",
    kind: "subtotal",
    currentMonth: 55_200,
    ytd: 520_700,
    valuesByPeriod: { "2024-09": 49_200, "2024-10": 51_900, "2024-11": 55_200 },
  },
  { id: "cor-h", label: "Cost of revenue", kind: "section", currentMonth: 0, ytd: 0 },
  {
    id: "cor-host",
    label: "Hosting & infrastructure",
    kind: "line",
    currentMonth: 6_200,
    ytd: 58_400,
    valuesByPeriod: { "2024-09": 5_800, "2024-10": 6_000, "2024-11": 6_200 },
  },
  {
    id: "cor-sup",
    label: "Customer support payroll",
    kind: "line",
    currentMonth: 9_100,
    ytd: 86_700,
    valuesByPeriod: { "2024-09": 8_600, "2024-10": 8_900, "2024-11": 9_100 },
  },
  {
    id: "cor-tot",
    label: "Total cost of revenue",
    kind: "subtotal",
    currentMonth: 15_300,
    ytd: 145_100,
    valuesByPeriod: { "2024-09": 14_400, "2024-10": 14_900, "2024-11": 15_300 },
  },
  {
    id: "gp",
    label: "Gross profit",
    kind: "highlight",
    currentMonth: 39_900,
    ytd: 375_600,
    valuesByPeriod: { "2024-09": 34_800, "2024-10": 37_000, "2024-11": 39_900 },
  },
  { id: "opex-h", label: "Operating expenses", kind: "section", currentMonth: 0, ytd: 0 },
  {
    id: "opex-rd",
    label: "Research & development",
    kind: "line",
    currentMonth: 18_500,
    ytd: 172_000,
    valuesByPeriod: { "2024-09": 17_200, "2024-10": 17_800, "2024-11": 18_500 },
  },
  {
    id: "opex-sales",
    label: "Sales & marketing",
    kind: "line",
    currentMonth: 14_200,
    ytd: 128_400,
    valuesByPeriod: { "2024-09": 13_100, "2024-10": 13_600, "2024-11": 14_200 },
  },
  {
    id: "opex-ga",
    label: "General & administrative",
    kind: "line",
    currentMonth: 7_800,
    ytd: 71_200,
    valuesByPeriod: { "2024-09": 7_400, "2024-10": 7_600, "2024-11": 7_800 },
  },
  {
    id: "opex-tot",
    label: "Total operating expenses",
    kind: "subtotal",
    currentMonth: 40_500,
    ytd: 371_600,
    valuesByPeriod: { "2024-09": 37_700, "2024-10": 39_000, "2024-11": 40_500 },
  },
  {
    id: "op-inc",
    label: "Operating income",
    kind: "total",
    currentMonth: -600,
    ytd: 4_000,
    valuesByPeriod: { "2024-09": -2_900, "2024-10": -2_000, "2024-11": -600 },
  },
  {
    id: "other",
    label: "Other income (expense), net",
    kind: "line",
    currentMonth: 1_200,
    ytd: 3_400,
    valuesByPeriod: { "2024-09": 800, "2024-10": 1_000, "2024-11": 1_200 },
  },
  {
    id: "net",
    label: "Net income",
    kind: "total",
    currentMonth: 600,
    ytd: 7_400,
    valuesByPeriod: { "2024-09": -2_100, "2024-10": -1_000, "2024-11": 600 },
  },
];

export type BalanceRowKind =
  | "section"
  | "subsection"
  | "line"
  | "subtotal"
  | "total"
  | "reconcile";

export interface BalanceSheetRow {
  id: string;
  label: string;
  kind: BalanceRowKind;
  balance: number;
  priorMonth: number;
}

export const BALANCE_SHEET_ROWS: BalanceSheetRow[] = [
  { id: "a-h", label: "Assets", kind: "section", balance: 0, priorMonth: 0 },
  {
    id: "a-nc-h",
    label: "Non-current assets",
    kind: "subsection",
    balance: 0,
    priorMonth: 0,
  },
  {
    id: "a-ppe",
    label: "Property & equipment",
    kind: "line",
    balance: 48_000,
    priorMonth: 49_200,
  },
  {
    id: "a-int",
    label: "Intangible assets",
    kind: "line",
    balance: 22_500,
    priorMonth: 23_000,
  },
  {
    id: "a-nc-t",
    label: "Total non-current assets",
    kind: "subtotal",
    balance: 70_500,
    priorMonth: 72_200,
  },
  {
    id: "a-c-h",
    label: "Current assets",
    kind: "subsection",
    balance: 0,
    priorMonth: 0,
  },
  {
    id: "a-cash",
    label: "Cash & cash equivalents",
    kind: "line",
    balance: 186_400,
    priorMonth: 172_100,
  },
  {
    id: "a-ar",
    label: "Accounts receivable",
    kind: "line",
    balance: 64_200,
    priorMonth: 58_900,
  },
  {
    id: "a-prep",
    label: "Prepaid expenses",
    kind: "line",
    balance: 8_100,
    priorMonth: 7_400,
  },
  {
    id: "a-c-t",
    label: "Total current assets",
    kind: "subtotal",
    balance: 258_700,
    priorMonth: 238_400,
  },
  {
    id: "a-tot",
    label: "Total assets",
    kind: "total",
    balance: 329_200,
    priorMonth: 310_600,
  },
  { id: "l-h", label: "Liabilities", kind: "section", balance: 0, priorMonth: 0 },
  {
    id: "l-nc",
    label: "Long-term debt",
    kind: "line",
    balance: 42_000,
    priorMonth: 44_000,
  },
  {
    id: "l-ap",
    label: "Accounts payable",
    kind: "line",
    balance: 18_600,
    priorMonth: 21_200,
  },
  {
    id: "l-defer",
    label: "Deferred revenue",
    kind: "line",
    balance: 56_800,
    priorMonth: 52_400,
  },
  {
    id: "l-acc",
    label: "Accrued expenses",
    kind: "line",
    balance: 11_200,
    priorMonth: 10_500,
  },
  {
    id: "l-tot",
    label: "Total liabilities",
    kind: "subtotal",
    balance: 128_600,
    priorMonth: 128_100,
  },
  { id: "e-h", label: "Equity", kind: "section", balance: 0, priorMonth: 0 },
  {
    id: "e-cap",
    label: "Share capital",
    kind: "line",
    balance: 25_000,
    priorMonth: 25_000,
  },
  {
    id: "e-re",
    label: "Retained earnings",
    kind: "line",
    balance: 175_600,
    priorMonth: 157_500,
  },
  {
    id: "e-tot",
    label: "Total equity",
    kind: "subtotal",
    balance: 200_600,
    priorMonth: 182_500,
  },
  {
    id: "l-e",
    label: "Total liabilities + equity",
    kind: "reconcile",
    balance: 329_200,
    priorMonth: 310_600,
  },
];

export const BALANCE_SHEET_INSIGHT =
  "Working capital improved vs prior month: cash and receivables up while payables normalized. Assets remain funded primarily by equity and recurring deferred revenue.";

export type CashFlowRowKind =
  | "section"
  | "line"
  | "ops-highlight"
  | "subtotal"
  | "total"
  | "closing";

export interface CashFlowRow {
  id: string;
  label: string;
  kind: CashFlowRowKind;
  currentMonth: number;
  ytd: number;
}

export const CASH_FLOW_ROWS: CashFlowRow[] = [
  { id: "op-h", label: "Operating activities", kind: "section", currentMonth: 0, ytd: 0 },
  {
    id: "op-ni",
    label: "Net income",
    kind: "line",
    currentMonth: 600,
    ytd: 7_400,
  },
  {
    id: "op-da",
    label: "Depreciation & amortization",
    kind: "line",
    currentMonth: 2_400,
    ytd: 21_600,
  },
  {
    id: "op-ar",
    label: "Change in accounts receivable",
    kind: "line",
    currentMonth: -5_300,
    ytd: -12_800,
  },
  {
    id: "op-ap",
    label: "Change in accounts payable",
    kind: "line",
    currentMonth: -2_600,
    ytd: -4_100,
  },
  {
    id: "op-def",
    label: "Change in deferred revenue",
    kind: "line",
    currentMonth: 4_400,
    ytd: 18_200,
  },
  {
    id: "op-cfo",
    label: "Cash from operations",
    kind: "ops-highlight",
    currentMonth: 12_700,
    ytd: 98_500,
  },
  { id: "inv-h", label: "Investing activities", kind: "section", currentMonth: 0, ytd: 0 },
  {
    id: "inv-capex",
    label: "Capital expenditures",
    kind: "line",
    currentMonth: -3_200,
    ytd: -28_400,
  },
  {
    id: "inv-sw",
    label: "Software & tooling",
    kind: "line",
    currentMonth: -1_100,
    ytd: -9_800,
  },
  {
    id: "inv-tot",
    label: "Net cash from investing",
    kind: "subtotal",
    currentMonth: -4_300,
    ytd: -38_200,
  },
  { id: "fin-h", label: "Financing activities", kind: "section", currentMonth: 0, ytd: 0 },
  {
    id: "fin-debt",
    label: "Debt repayments",
    kind: "line",
    currentMonth: -2_000,
    ytd: -8_000,
  },
  {
    id: "fin-eq",
    label: "Equity contributions",
    kind: "line",
    currentMonth: 0,
    ytd: 15_000,
  },
  {
    id: "fin-tot",
    label: "Net cash from financing",
    kind: "subtotal",
    currentMonth: -2_000,
    ytd: 7_000,
  },
  {
    id: "net-chg",
    label: "Net change in cash",
    kind: "total",
    currentMonth: 6_400,
    ytd: 67_300,
  },
  {
    id: "open",
    label: "Opening cash balance",
    kind: "line",
    currentMonth: 180_000,
    ytd: 119_100,
  },
  {
    id: "close",
    label: "Closing cash balance",
    kind: "closing",
    currentMonth: 186_400,
    ytd: 186_400,
  },
];

export const CASH_FLOW_INSIGHT =
  "Operating cash flow covers investing outflows; financing reflects scheduled debt service. Closing cash is healthy relative to monthly burn.";

export interface ExecutiveSaaSMetric {
  id: string;
  name: string;
  valueDisplay: string;
  sublabel?: string;
  sparkline: HomeKpiSparkPoint[];
  trendPositive: boolean;
  formatTooltip: (v: number) => string;
}

export const EXECUTIVE_SAAS_METRICS: ExecutiveSaaSMetric[] = [
  {
    id: "mrr",
    name: "MRR",
    valueDisplay: "€428k",
    sublabel: "vs prior month",
    trendPositive: true,
    sparkline: [
      { i: 0, v: 0.38 },
      { i: 1, v: 0.39 },
      { i: 2, v: 0.4 },
      { i: 3, v: 0.41 },
      { i: 4, v: 0.415 },
      { i: 5, v: 0.428 },
    ],
    formatTooltip: (v) =>
      `€${(v * 1000).toFixed(0)}k`,
  },
  {
    id: "arr",
    name: "ARR",
    valueDisplay: "€5.1M",
    trendPositive: true,
    sparkline: [
      { i: 0, v: 4.5 },
      { i: 1, v: 4.65 },
      { i: 2, v: 4.78 },
      { i: 3, v: 4.9 },
      { i: 4, v: 5.02 },
      { i: 5, v: 5.14 },
    ],
    formatTooltip: (v) => `€${v.toFixed(2)}M`,
  },
  {
    id: "nrr",
    name: "Net revenue retention",
    valueDisplay: "118%",
    sublabel: "logo + expansion",
    trendPositive: true,
    sparkline: [
      { i: 0, v: 108 },
      { i: 1, v: 110 },
      { i: 2, v: 112 },
      { i: 3, v: 114 },
      { i: 4, v: 116 },
      { i: 5, v: 118 },
    ],
    formatTooltip: (v) => `${v.toFixed(0)}%`,
  },
  {
    id: "cac",
    name: "CAC payback",
    valueDisplay: "11 mo",
    trendPositive: true,
    sparkline: [
      { i: 0, v: 16 },
      { i: 1, v: 15 },
      { i: 2, v: 14 },
      { i: 3, v: 13 },
      { i: 4, v: 12 },
      { i: 5, v: 11 },
    ],
    formatTooltip: (v) => `${v.toFixed(0)} mo`,
  },
  {
    id: "gpm",
    name: "Gross margin",
    valueDisplay: "72%",
    trendPositive: false,
    sparkline: [
      { i: 0, v: 76 },
      { i: 1, v: 75 },
      { i: 2, v: 74 },
      { i: 3, v: 73 },
      { i: 4, v: 72.5 },
      { i: 5, v: 72 },
    ],
    formatTooltip: (v) => `${v.toFixed(1)}%`,
  },
  {
    id: "rule40",
    name: "Rule of 40",
    valueDisplay: "44",
    sublabel: "growth + margin",
    trendPositive: true,
    sparkline: [
      { i: 0, v: 32 },
      { i: 1, v: 35 },
      { i: 2, v: 38 },
      { i: 3, v: 40 },
      { i: 4, v: 42 },
      { i: 5, v: 44 },
    ],
    formatTooltip: (v) => v.toFixed(0),
  },
];
