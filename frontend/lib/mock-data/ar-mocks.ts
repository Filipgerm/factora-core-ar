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

/** AR invoices list row — matches invoices dashboard table layout. */
export type ArInvoiceRow = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  /** e.g. `ΑΦΜ: 123456789` or `EU VAT: NL854123456B01` */
  customerTaxLabel: string;
  amount: number;
  dueDate: string | null;
  pipeline: ArInvoicePipeline;
  mydataStatus: ArMydataTransmission;
  /** MARK when transmitted; null otherwise */
  mydataMark: string | null;
  /** ISO date — for `paid` rows, used in “Paid this month” KPI */
  paidAt?: string | null;
};

/** KPI strip aligned with dashboard design (demo totals). */
export const arInvoicesSummaryKpis = {
  totalOutstanding: { amount: 67_300, count: 14 },
  dueWithin30Days: { amount: 18_400, count: 6 },
  overdue: { amount: 12_200, count: 3 },
  paidThisMonth: { amount: 36_700, count: 8 },
} as const;

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

/** Calendar ISO date (YYYY-MM-DD) relative to local today — keeps AR demo due dates current. */
function shiftDaysFromToday(deltaDays: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Demo invoice rows: open items use due dates **1–65 days** overdue or **1–65 days** in the future.
 * Two `sent` rows have **future** due dates (not overdue); the rest of open AR is overdue or partial.
 */
export const mockArInvoiceRows: ArInvoiceRow[] = (() => {
  const d = shiftDaysFromToday;
  return [
    {
      id: "inv-47",
      invoiceNumber: "ΤΠΥ-0047",
      customerName: "Acme Software IKE",
      customerTaxLabel: "ΑΦΜ: 123456789",
      amount: 2976,
      dueDate: d(-12),
      pipeline: "overdue",
      mydataStatus: "transmitted",
      mydataMark: "40021847",
    },
    {
      id: "inv-46",
      invoiceNumber: "ΤΠΥ-0046",
      customerName: "Hellas Ventures Ltd",
      customerTaxLabel: "ΑΦΜ: 987654321",
      amount: 14_880,
      dueDate: d(24),
      pipeline: "sent",
      mydataStatus: "transmitted",
      mydataMark: "40021801",
    },
    {
      id: "inv-45",
      invoiceNumber: "ΤΠΥ-0045",
      customerName: "TechStart BV (NL)",
      customerTaxLabel: "EU VAT: NL854123456B01",
      amount: 6000,
      dueDate: d(-38),
      pipeline: "paid",
      mydataStatus: "transmitted",
      mydataMark: "40021774",
      paidAt: d(-5),
    },
    {
      id: "inv-44",
      invoiceNumber: "ΤΠΥ-0044",
      customerName: "Marathon Ventures AE",
      customerTaxLabel: "ΑΦΜ: 555123456",
      amount: 4200,
      dueDate: null,
      pipeline: "draft",
      mydataStatus: "pending",
      mydataMark: null,
    },
    {
      id: "inv-43",
      invoiceNumber: "ΤΠΥ-0043",
      customerName: "Orpheus Cloud IKE",
      customerTaxLabel: "ΑΦΜ: EL801813872",
      amount: 8920,
      dueDate: d(47),
      pipeline: "sent",
      mydataStatus: "transmitted",
      mydataMark: "40021712",
    },
    {
      id: "inv-42",
      invoiceNumber: "ΤΠΥ-0042",
      customerName: "Nordic Retail AB",
      customerTaxLabel: "EU VAT: SE5566778890",
      amount: 12_840,
      dueDate: d(-65),
      pipeline: "overdue",
      mydataStatus: "transmitted",
      mydataMark: "40021690",
    },
    {
      id: "inv-41",
      invoiceNumber: "ΤΠΥ-0041",
      customerName: "Mediterranean Foods SA",
      customerTaxLabel: "ΑΦΜ: EL099887766",
      amount: 3920.5,
      dueDate: d(-29),
      pipeline: "overdue",
      mydataStatus: "pending",
      mydataMark: null,
    },
    {
      id: "inv-40",
      invoiceNumber: "ΤΠΥ-0040",
      customerName: "Alpine Components GmbH",
      customerTaxLabel: "EU VAT: DE811115368",
      amount: 684.9,
      dueDate: d(-17),
      pipeline: "partially_paid",
      mydataStatus: "transmitted",
      mydataMark: "40021501",
    },
    {
      id: "inv-39",
      invoiceNumber: "ΤΠΥ-0039",
      customerName: "Athens Logistics SA",
      customerTaxLabel: "ΑΦΜ: EL998877665",
      amount: 5600,
      dueDate: d(-4),
      pipeline: "overdue",
      mydataStatus: "error",
      mydataMark: null,
    },
    {
      id: "inv-38",
      invoiceNumber: "ΤΠΥ-0038",
      customerName: "Piraeus Marine Supplies ΕΠΕ",
      customerTaxLabel: "ΑΦΜ: EL044512398",
      amount: 3250,
      dueDate: d(-55),
      pipeline: "overdue",
      mydataStatus: "transmitted",
      mydataMark: "40021488",
    },
    {
      id: "inv-37",
      invoiceNumber: "ΤΠΥ-0037",
      customerName: "Stripe Payments Europe Ltd",
      customerTaxLabel: "EU VAT: IE3206488LH",
      amount: 412.18,
      dueDate: d(-22),
      pipeline: "paid",
      mydataStatus: "transmitted",
      mydataMark: "40021402",
      paidAt: d(-9),
    },
    {
      id: "inv-36",
      invoiceNumber: "ΤΠΥ-0036",
      customerName: "Amsterdam Design BV",
      customerTaxLabel: "EU VAT: NL855512345B01",
      amount: 7800,
      dueDate: d(-41),
      pipeline: "overdue",
      mydataStatus: "transmitted",
      mydataMark: "40021355",
    },
    {
      id: "inv-35",
      invoiceNumber: "ΤΠΥ-0035",
      customerName: "Lyon Ingénierie SAS",
      customerTaxLabel: "EU VAT: FR33456789012",
      amount: 9550,
      dueDate: d(-8),
      pipeline: "paid",
      mydataStatus: "transmitted",
      mydataMark: "40021290",
      paidAt: d(-3),
    },
    {
      id: "inv-34",
      invoiceNumber: "ΤΠΥ-0034",
      customerName: "Φωτόδεντρο Μονοπρόσωπη ΙΚΕ",
      customerTaxLabel: "ΑΦΜ: EL090270128",
      amount: 1890,
      dueDate: d(-1),
      pipeline: "overdue",
      mydataStatus: "pending",
      mydataMark: null,
    },
  ];
})();

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
