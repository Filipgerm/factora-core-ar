/**
 * Rich mock data for Accounts Receivable list views and drill-down sheets.
 */

export type ArCountry = "GR" | "DE" | "NL" | "FR" | "IE";

export type ArInvoiceLineMini = {
  id: string;
  number: string;
  amount: number;
  status: "open" | "paid";
  dueDate: string;
};

export type ArPaymentMini = {
  id: string;
  date: string;
  amount: string;
  method: string;
};

export type ArCustomer = {
  id: string;
  legalName: string;
  vatNumber: string;
  country: ArCountry;
  totalOutstanding: number;
  overdueAmount: number;
  dsoDays: number;
  paymentTerms: string;
  lastPaymentDate: string | null;
  invoices: ArInvoiceLineMini[];
  payments: ArPaymentMini[];
  aging: { current: number; d1_30: number; d31_60: number; d60plus: number };
};

export type ArProduct = {
  id: string;
  name: string;
  defaultPrice: number;
  priceTiers: string | null;
  vatRate: number;
  glAccount: string;
  mydataCategoryCode: string;
  deferredRevenue: boolean;
  recognitionPeriod: string;
};

export type ArContractStatus = "active" | "expired" | "cancelled";

export type ArContract = {
  id: string;
  customerName: string;
  startDate: string;
  endDate: string;
  tcv: number;
  recognizedToDate: number;
  deferredRemaining: number;
  nextRenewalDate: string;
  status: ArContractStatus;
  recognitionSchedule: { period: string; amount: number }[];
};

export type ArInvoicePipeline =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue";

export type ArMydataTransmission = "transmitted" | "pending" | "error";

export type ArInvoiceRow = {
  id: string;
  pipeline: ArInvoicePipeline;
  amount: number;
  vat: number;
  customerName: string;
  dueDate: string;
  daysOverdue: number;
  mydataStatus: ArMydataTransmission;
  paymentMatching: "matched" | "partial" | "unmatched";
};

export type ArCreditMemoStatus = "draft" | "issued" | "applied";

export type ArCreditMemo = {
  id: string;
  originalInvoiceRef: string;
  linkedInvoiceId: string;
  reason: string;
  amount: number;
  status: ArCreditMemoStatus;
  reducesOutstanding: boolean;
};

export const mockArCustomers: ArCustomer[] = [
  {
    id: "c1",
    legalName: "Nordic Retail AB",
    vatNumber: "DE334455667",
    country: "DE",
    totalOutstanding: 42_180.5,
    overdueAmount: 12_840,
    dsoDays: 38,
    paymentTerms: "Net 30",
    lastPaymentDate: "2026-02-14",
    invoices: [
      {
        id: "i1",
        number: "INV-2026-0140",
        amount: 12840,
        status: "open",
        dueDate: "2026-01-18",
      },
      {
        id: "i2",
        number: "INV-2026-0112",
        amount: 8900.5,
        status: "open",
        dueDate: "2026-03-01",
      },
    ],
    payments: [
      { id: "p1", date: "2026-02-14", amount: "€24,200.00", method: "SEPA" },
      { id: "p2", date: "2026-01-03", amount: "€18,450.00", method: "Wire" },
    ],
    aging: { current: 8900.5, d1_30: 0, d31_60: 12840, d60plus: 0 },
  },
  {
    id: "c2",
    legalName: "Mediterranean Foods SA",
    vatNumber: "EL099887766",
    country: "GR",
    totalOutstanding: 18_920,
    overdueAmount: 3920.5,
    dsoDays: 24,
    paymentTerms: "Net 45",
    lastPaymentDate: "2026-03-01",
    invoices: [
      {
        id: "i3",
        number: "INV-2026-0138",
        amount: 3920.5,
        status: "open",
        dueDate: "2026-02-02",
      },
    ],
    payments: [
      { id: "p3", date: "2026-03-01", amount: "€11,200.00", method: "SEPA" },
    ],
    aging: { current: 14999.5, d1_30: 3920.5, d31_60: 0, d60plus: 0 },
  },
  {
    id: "c3",
    legalName: "Alpine Components GmbH",
    vatNumber: "DE811115368",
    country: "DE",
    totalOutstanding: 684.9,
    overdueAmount: 684.9,
    dsoDays: 52,
    paymentTerms: "Net 14",
    lastPaymentDate: "2025-11-20",
    invoices: [
      {
        id: "i4",
        number: "INV-2026-0129",
        amount: 684.9,
        status: "open",
        dueDate: "2026-02-28",
      },
    ],
    payments: [],
    aging: { current: 0, d1_30: 684.9, d31_60: 0, d60plus: 0 },
  },
  {
    id: "c4",
    legalName: "Orpheus Cloud IKE",
    vatNumber: "EL801813872",
    country: "GR",
    totalOutstanding: 0,
    overdueAmount: 0,
    dsoDays: 12,
    paymentTerms: "Net 30",
    lastPaymentDate: "2026-03-08",
    invoices: [],
    payments: [
      { id: "p4", date: "2026-03-08", amount: "€4,200.00", method: "Card" },
    ],
    aging: { current: 0, d1_30: 0, d31_60: 0, d60plus: 0 },
  },
];

export const mockArProducts: ArProduct[] = [
  {
    id: "pr1",
    name: "Platform — Growth",
    defaultPrice: 499,
    priceTiers: "€299 / €499 / €899",
    vatRate: 24,
    glAccount: "4100 — Subscription revenue",
    mydataCategoryCode: "E3_561_001",
    deferredRevenue: true,
    recognitionPeriod: "Monthly straight-line",
  },
  {
    id: "pr2",
    name: "Professional services bundle",
    defaultPrice: 150,
    priceTiers: null,
    vatRate: 24,
    glAccount: "4200 — Services",
    mydataCategoryCode: "E3_561_002",
    deferredRevenue: false,
    recognitionPeriod: "—",
  },
  {
    id: "pr3",
    name: "Usage overage (API units)",
    defaultPrice: 0.012,
    priceTiers: "Tiered per 1M calls",
    vatRate: 24,
    glAccount: "4110 — Usage revenue",
    mydataCategoryCode: "E3_561_003",
    deferredRevenue: false,
    recognitionPeriod: "Monthly usage",
  },
];

function daysFrom(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export const mockArContracts: ArContract[] = [
  {
    id: "ct1",
    customerName: "Nordic Retail AB",
    startDate: "2025-04-01",
    endDate: "2026-03-31",
    tcv: 180_000,
    recognizedToDate: 165_000,
    deferredRemaining: 15_000,
    nextRenewalDate: "2025-05-18",
    status: "active",
    recognitionSchedule: [
      { period: "2026-01", amount: 15000 },
      { period: "2026-02", amount: 15000 },
      { period: "2026-03", amount: 15000 },
    ],
  },
  {
    id: "ct2",
    customerName: "Orpheus Cloud IKE",
    startDate: "2024-01-15",
    endDate: "2026-04-28",
    tcv: 48_000,
    recognizedToDate: 44_000,
    deferredRemaining: 4000,
    nextRenewalDate: "2025-04-08",
    status: "active",
    recognitionSchedule: [
      { period: "2026-02", amount: 2000 },
      { period: "2026-03", amount: 2000 },
      { period: "2026-04", amount: 2000 },
    ],
  },
  {
    id: "ct3",
    customerName: "Legacy Client Ltd",
    startDate: "2023-06-01",
    endDate: "2025-12-31",
    tcv: 12_000,
    recognizedToDate: 12_000,
    deferredRemaining: 0,
    nextRenewalDate: "2025-12-31",
    status: "expired",
    recognitionSchedule: [],
  },
];

export function contractRenewalAlert(
  nextRenewalDate: string,
  status: ArContractStatus
): "30" | "60" | null {
  if (status !== "active") return null;
  const d = daysFrom(nextRenewalDate);
  if (d <= 30 && d >= 0) return "30";
  if (d <= 60 && d > 30) return "60";
  return null;
}

export const mockArInvoiceRows: ArInvoiceRow[] = [
  {
    id: "inv-r1",
    pipeline: "overdue",
    amount: 12840,
    vat: 3081.6,
    customerName: "Nordic Retail AB",
    dueDate: "2026-01-18",
    daysOverdue: 45,
    mydataStatus: "transmitted",
    paymentMatching: "unmatched",
  },
  {
    id: "inv-r2",
    pipeline: "partially_paid",
    amount: 8900.5,
    vat: 2136.12,
    customerName: "Nordic Retail AB",
    dueDate: "2026-03-30",
    daysOverdue: 0,
    mydataStatus: "transmitted",
    paymentMatching: "partial",
  },
  {
    id: "inv-r3",
    pipeline: "sent",
    amount: 3920.5,
    vat: 940.92,
    customerName: "Mediterranean Foods SA",
    dueDate: "2026-04-05",
    daysOverdue: 0,
    mydataStatus: "pending",
    paymentMatching: "unmatched",
  },
  {
    id: "inv-r4",
    pipeline: "paid",
    amount: 2499,
    vat: 599.76,
    customerName: "Orpheus Cloud IKE",
    dueDate: "2026-02-28",
    daysOverdue: 0,
    mydataStatus: "transmitted",
    paymentMatching: "matched",
  },
  {
    id: "inv-r5",
    pipeline: "draft",
    amount: 5600,
    vat: 1344,
    customerName: "Athens Logistics SA",
    dueDate: "2026-04-20",
    daysOverdue: 0,
    mydataStatus: "pending",
    paymentMatching: "unmatched",
  },
  {
    id: "inv-r6",
    pipeline: "overdue",
    amount: 684.9,
    vat: 164.38,
    customerName: "Alpine Components GmbH",
    dueDate: "2026-02-28",
    daysOverdue: 12,
    mydataStatus: "error",
    paymentMatching: "unmatched",
  },
];

export function arAgingTotals(rows: ArInvoiceRow[]) {
  let current = 0;
  let d1_30 = 0;
  let d31_60 = 0;
  let d60plus = 0;
  for (const r of rows) {
    if (r.pipeline === "paid") continue;
    if (r.daysOverdue <= 0) current += r.amount;
    else if (r.daysOverdue <= 30) d1_30 += r.amount;
    else if (r.daysOverdue <= 60) d31_60 += r.amount;
    else d60plus += r.amount;
  }
  return { current, d1_30, d31_60, d60plus };
}

export const mockArCreditMemos: ArCreditMemo[] = [
  {
    id: "cm1",
    originalInvoiceRef: "INV-2026-0101",
    linkedInvoiceId: "inv-legacy-1",
    reason: "Service credit — SLA breach",
    amount: 1200,
    status: "applied",
    reducesOutstanding: true,
  },
  {
    id: "cm2",
    originalInvoiceRef: "INV-2026-0122",
    linkedInvoiceId: "inv-legacy-2",
    reason: "Volume discount true-up",
    amount: 450,
    status: "issued",
    reducesOutstanding: false,
  },
  {
    id: "cm3",
    originalInvoiceRef: "—",
    linkedInvoiceId: "",
    reason: "Goodwill adjustment",
    amount: 200,
    status: "draft",
    reducesOutstanding: false,
  },
];

export const mockArInvoiceRefsForMemo = [
  { id: "inv-legacy-1", ref: "INV-2026-0101", customer: "Nordic Retail AB" },
  { id: "inv-legacy-2", ref: "INV-2026-0122", customer: "Orpheus Cloud IKE" },
];
