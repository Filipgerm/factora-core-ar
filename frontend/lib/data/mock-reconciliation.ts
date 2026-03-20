/**
 * Mock data for the AI Reconciliation dashboard.
 * Used for UI visualization before FastAPI backend connection.
 */

export type MatchStatus = "matched" | "needs_review" | "unmatched";
export type AiConfidence = "high" | "medium" | "low" | "rule" | "none";

export interface BankTransaction {
  id: string;
  date: string;
  payer: string;
  payerSubtext?: string;
  account: string;
  accountLast4: string;
  entity: string; // country code
  amount: number; // negative = debit, positive = credit
}

export interface ReconciliationMatch {
  id: string;
  bankTransaction: BankTransaction;
  invoiceId?: string;
  vendorCustomer?: string;
  vendorCustomerSubtext?: string;
  entity?: string;
  glAccount?: string;
  glAccountName?: string;
  amount?: number;
  partialAmount?: number; // for partial matches
  aiConfidence: AiConfidence;
  matchStatus: MatchStatus;
  aiReasoning?: string;
}

export const MOCK_RECONCILIATION_MATCHES: ReconciliationMatch[] = [
  {
    id: "rec-1",
    bankTransaction: {
      id: "tx-1",
      date: "2026-03-15",
      payer: "Alpha Technologies SA",
      payerSubtext: "Bank transfer",
      account: "Piraeus",
      accountLast4: "4521",
      entity: "GR",
      amount: -506234,
    },
    invoiceId: "INV-001",
    vendorCustomer: "Alpha Technologies SA",
    vendorCustomerSubtext: "INV-001",
    entity: "GR",
    glAccount: "40110",
    glAccountName: "Subscription Revenue",
    amount: 506234,
    aiConfidence: "high",
    matchStatus: "matched",
    aiReasoning: "Exact amount match with invoice INV-001.",
  },
  {
    id: "rec-2",
    bankTransaction: {
      id: "tx-2",
      date: "2026-03-14",
      payer: "Stripe Payments",
      payerSubtext: "ACH Credit",
      account: "Eurobank",
      accountLast4: "8892",
      entity: "US",
      amount: 30000,
    },
    invoiceId: "INV-002",
    vendorCustomer: "Stripe",
    vendorCustomerSubtext: "INV-002",
    entity: "US",
    glAccount: "40110",
    glAccountName: "Subscription Revenue",
    amount: 30000,
    aiConfidence: "high",
    matchStatus: "matched",
    aiReasoning: "Exact amount and merchant match.",
  },
  {
    id: "rec-3",
    bankTransaction: {
      id: "tx-3",
      date: "2026-03-13",
      payer: "Fenwick West",
      payerSubtext: "Wire",
      account: "Piraeus",
      accountLast4: "4521",
      entity: "US",
      amount: -27045.87,
    },
    invoiceId: "BILL-101",
    vendorCustomer: "Fenwick West LLP",
    vendorCustomerSubtext: "BILL-101",
    entity: "US",
    glAccount: "60212",
    glAccountName: "Software",
    amount: 27045.87,
    partialAmount: 27045.87,
    aiConfidence: "medium",
    matchStatus: "needs_review",
    aiReasoning:
      "Matched based on exact amount and similar merchant name. Bills are irregular (gaps between months) with one clear pattern.",
  },
  {
    id: "rec-4",
    bankTransaction: {
      id: "tx-4",
      date: "2026-03-12",
      payer: "AWS EMEA",
      payerSubtext: "Direct Debit",
      account: "Eurobank",
      accountLast4: "8892",
      entity: "IE",
      amount: -8450.5,
    },
    invoiceId: "BILL-104",
    vendorCustomer: "Amazon Web Services",
    vendorCustomerSubtext: "BILL-104",
    entity: "IE",
    glAccount: "60212",
    glAccountName: "COGS Hosting",
    amount: 8450.5,
    aiConfidence: "medium",
    matchStatus: "needs_review",
    aiReasoning:
      "Amount matches AWS invoice. Vendor name differs slightly (AWS EMEA vs Amazon Web Services).",
  },
];

export const MOCK_ACCOUNTS = [
  { id: "all", name: "All accounts" },
  { id: "piraeus-4521", name: "Piraeus ****4521" },
  { id: "eurobank-8892", name: "Eurobank ****8892" },
];
