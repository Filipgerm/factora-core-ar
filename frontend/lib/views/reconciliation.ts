/** Reconciliation UI types (ledger ↔ bank). No mock rows. */

export type ReconciliationBankId =
  | "eurobank"
  | "revolut"
  | "n26"
  | "deutschebank"
  | "piraeus";

export interface ReconciliationBankTransaction {
  id: string;
  date: string;
  amount: number;
  currency: "EUR";
  merchant: string;
  rawDescriptor: string;
  payerHint: string;
  bankId: ReconciliationBankId;
  maskedAccount: string;
  memo?: string;
}

export type ReconciliationInvoiceRole = "AR" | "AP";

export type ReconciliationInvoiceCategory =
  | "subscription"
  | "services"
  | "travel"
  | "fee"
  | "receivable"
  | "payable"
  | "logistics"
  | "other";

export type ReconciliationCounterpartyKind = "vendor" | "customer" | "other";

export interface ReconciliationBookInvoice {
  id: string;
  invoiceNumber: string;
  dueDate: string;
  counterpartyName: string;
  totalAmount: number;
  currency: "EUR";
  role: ReconciliationInvoiceRole;
  status: "Open" | "Overdue" | "Partial";
  glAccount: string;
  invoiceCategory: ReconciliationInvoiceCategory;
  counterpartyKind: ReconciliationCounterpartyKind;
  invoiceSummary: string;
}

export interface ReconciliationPendingPair {
  id: string;
  transaction: ReconciliationBankTransaction;
  invoice: ReconciliationBookInvoice;
  matchCandidates?: ReconciliationBookInvoice[];
  aiConfidencePercent: number;
  aiReasoning: string;
  matchLogicSummary?: string;
}

export interface ReconciliationAutoMatchedPair {
  id: string;
  transaction: ReconciliationBankTransaction;
  invoice: ReconciliationBookInvoice;
  matchLogicSummary?: string;
}
