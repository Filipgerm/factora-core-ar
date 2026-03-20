/**
 * Mock data for the Smart Ledger & Counterparties view.
 * Used for UI visualization before FastAPI backend connection.
 */

export type AiConfidence = "high" | "medium" | "low";
export type CounterpartyType = "customer" | "vendor" | "both";

export interface LedgerCounterparty {
  id: string;
  name: string;
  type: CounterpartyType;
  vatNumber: string | null;
  country: string;
  recentInvoices: { id: string; amount: number; date: string }[];
  category: string;
  aiConfidence: AiConfidence;
  gemiVerified: boolean | null; // null = not Greek, true/false for GR
}

export const MOCK_LEDGER_COUNTERPARTIES: LedgerCounterparty[] = [
  {
    id: "cp-1",
    name: "Alpha Technologies SA",
    type: "customer",
    vatNumber: "EL123456789",
    country: "GR",
    recentInvoices: [
      { id: "INV-001", amount: 12500, date: "2026-03-15" },
      { id: "INV-002", amount: 8300, date: "2026-02-28" },
    ],
    category: "Subscription Revenue",
    aiConfidence: "high",
    gemiVerified: true,
  },
  {
    id: "cp-2",
    name: "Fenwick West LLP",
    type: "vendor",
    vatNumber: null,
    country: "US",
    recentInvoices: [
      { id: "BILL-101", amount: 14251, date: "2026-03-01" },
    ],
    category: "Professional Services",
    aiConfidence: "high",
    gemiVerified: null,
  },
  {
    id: "cp-3",
    name: "Beta Solutions EOOD",
    type: "vendor",
    vatNumber: "BG987654321",
    country: "BG",
    recentInvoices: [
      { id: "BILL-102", amount: 4500, date: "2026-02-20" },
    ],
    category: "",
    aiConfidence: "low",
    gemiVerified: null,
  },
  {
    id: "cp-4",
    name: "Gamma Industries GmbH",
    type: "both",
    vatNumber: "DE123456789",
    country: "DE",
    recentInvoices: [
      { id: "INV-003", amount: 22000, date: "2026-03-10" },
      { id: "BILL-103", amount: 8900, date: "2026-02-15" },
    ],
    category: "COGS",
    aiConfidence: "medium",
    gemiVerified: null,
  },
  {
    id: "cp-5",
    name: "Delta Logistics AE",
    type: "customer",
    vatNumber: "EL987654321",
    country: "GR",
    recentInvoices: [
      { id: "INV-004", amount: 5600, date: "2026-03-12" },
    ],
    category: "Software",
    aiConfidence: "high",
    gemiVerified: false,
  },
];

export const CATEGORY_OPTIONS = [
  "COGS",
  "Software",
  "Utilities",
  "Professional Services",
  "Subscription Revenue",
  "Loan Origination",
  "Shareholder Transfers",
  "Other",
];
