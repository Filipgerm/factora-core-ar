/** AR list view row types (mapped from API or AADE documents). */

export type ArInvoicePipeline =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue";

export type ArMydataTransmission =
  | "transmitted"
  | "pending"
  | "error"
  | "not_applicable";

export type ArCountry = "GR" | "DE" | "NL" | "FR" | "IE";

export interface ArInvoiceRow {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerTaxLabel: string;
  amount: number;
  dueDate: string | null;
  /** AADE issue date (ISO) when from myDATA documents */
  issueDate?: string | null;
  pipeline: ArInvoicePipeline;
  mydataStatus: ArMydataTransmission;
  mydataMark: string | null;
  paidAt?: string | null;
  /** Unified invoice GL draft link (``gl_journal_entry_id``) when present */
  glJournalEntryId?: string | null;
}

export interface ArCustomer {
  id: string;
  legalName: string;
  vatNumber: string;
  country: ArCountry;
  totalOutstanding: number;
  overdueAmount: number;
  dsoDays: number;
  paymentTerms: string;
  lastPaymentDate: string | null;
  /** TODO: Phase 3 Backend — AR aging buckets per counterparty */
  aging: { current: number; d1_30: number; d31_60: number; d60plus: number };
  invoices: { id: string; number: string; amount: number }[];
  payments: { id: string; date: string; amount: string; method: string }[];
}

export type ArCreditMemoStatus = "draft" | "issued" | "applied";

export interface ArCreditMemo {
  id: string;
  number: string;
  status: ArCreditMemoStatus;
  originalInvoiceRef: string;
  linkedInvoiceId: string;
  customerName: string;
  amount: number;
  reason: string;
  issuedAt: string | null;
}

export type ArContractStatus = "active" | "expired" | "cancelled";

export interface ArContract {
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
}

export interface ArProduct {
  id: string;
  name: string;
  defaultPrice: number;
  priceTiers: string | null;
  vatRate: number;
  glAccount: string;
  mydataCategoryCode: string;
  deferredRevenue: boolean;
  recognitionPeriod: string;
}
