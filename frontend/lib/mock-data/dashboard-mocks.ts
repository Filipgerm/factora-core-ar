/**
 * Demo data for dashboard / Smart Ledger — replace with API responses later.
 */

export type AiConfidence = "high" | "medium" | "low";

export type CountryCode = "GR" | "DE" | "NL" | "FR" | "IE";

export type LedgerCategory =
  | "COGS"
  | "Software"
  | "Payroll"
  | "Utilities"
  | "Professional services"
  | "Travel"
  | "Marketing"
  | "Rent";

export const LEDGER_CATEGORY_OPTIONS: LedgerCategory[] = [
  "COGS",
  "Software",
  "Payroll",
  "Utilities",
  "Professional services",
  "Travel",
  "Marketing",
  "Rent",
];

export interface MockCounterparty {
  id: string;
  legalName: string;
  vatId: string;
  country: CountryCode;
  /** Greek registry; meaningful when country === "GR" */
  gemiVerified: boolean;
  gemiNumber?: string;
}

export interface MockInvoice {
  id: string;
  /** Human-readable invoice reference */
  number: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  currency: "EUR";
  counterpartyId: string;
  suggestedCategory: LedgerCategory;
  aiConfidence: AiConfidence;
  description?: string;
}

/** Toggle to preview empty-state UI in development. */
export const SHOW_EMPTY_DEMO = false;

export const mockCounterparties: MockCounterparty[] = [
  {
    id: "cp-01",
    legalName: "Ακρίδας ΑΕ",
    vatId: "EL094014045",
    country: "GR",
    gemiVerified: true,
    gemiNumber: "123456701000",
  },
  {
    id: "cp-02",
    legalName: "Orpheus Cloud IKE",
    vatId: "EL801813872",
    country: "GR",
    gemiVerified: true,
    gemiNumber: "152345601000",
  },
  {
    id: "cp-03",
    legalName: "Berlin Analytics GmbH",
    vatId: "DE334455667",
    country: "DE",
    gemiVerified: false,
  },
  {
    id: "cp-04",
    legalName: "Athens Logistics SA",
    vatId: "EL998877665",
    country: "GR",
    gemiVerified: false,
    gemiNumber: "998877601000",
  },
  {
    id: "cp-05",
    legalName: "Stripe Payments Europe Ltd",
    vatId: "IE3206488LH",
    country: "IE",
    gemiVerified: false,
  },
  {
    id: "cp-06",
    legalName: "Deutsche Bahn AG",
    vatId: "DE811115368",
    country: "DE",
    gemiVerified: false,
  },
  {
    id: "cp-07",
    legalName: "Φωτόδεντρο Μονοπρόσωπη ΙΚΕ",
    vatId: "EL090270128",
    country: "GR",
    gemiVerified: true,
    gemiNumber: "145612301000",
  },
  {
    id: "cp-08",
    legalName: "Amsterdam Design BV",
    vatId: "NL855512345B01",
    country: "NL",
    gemiVerified: false,
  },
  {
    id: "cp-09",
    legalName: "Lyon Ingénierie SAS",
    vatId: "FR33456789012",
    country: "FR",
    gemiVerified: false,
  },
  {
    id: "cp-10",
    legalName: "Piraeus Marine Supplies ΕΠΕ",
    vatId: "EL044512398",
    country: "GR",
    gemiVerified: false,
    gemiNumber: "887766501000",
  },
];

export const mockInvoices: MockInvoice[] = [
  {
    id: "inv-001",
    number: "INV-2026-0142",
    issueDate: "2026-02-28",
    dueDate: "2026-03-30",
    amount: 18420.5,
    currency: "EUR",
    counterpartyId: "cp-01",
    suggestedCategory: "COGS",
    aiConfidence: "high",
    description: "Raw materials — aluminium extrusion batch Q1",
  },
  {
    id: "inv-002",
    number: "INV-2026-0143",
    issueDate: "2026-03-01",
    dueDate: "2026-03-31",
    amount: 2499.0,
    currency: "EUR",
    counterpartyId: "cp-02",
    suggestedCategory: "Software",
    aiConfidence: "high",
    description: "Annual GitHub Enterprise renewal",
  },
  {
    id: "inv-003",
    number: "INV-2026-0144",
    issueDate: "2026-03-02",
    dueDate: "2026-04-01",
    amount: 672.33,
    currency: "EUR",
    counterpartyId: "cp-03",
    suggestedCategory: "Software",
    aiConfidence: "low",
    description: "Unclear vendor — possible dev tools or hosting",
  },
  {
    id: "inv-004",
    number: "INV-2026-0145",
    issueDate: "2026-03-02",
    dueDate: "2026-03-16",
    amount: 12890.0,
    currency: "EUR",
    counterpartyId: "cp-04",
    suggestedCategory: "COGS",
    aiConfidence: "medium",
    description: "Freight & customs handling — port of Piraeus",
  },
  {
    id: "inv-005",
    number: "INV-2026-0146",
    issueDate: "2026-03-03",
    dueDate: "2026-03-03",
    amount: 412.18,
    currency: "EUR",
    counterpartyId: "cp-05",
    suggestedCategory: "Professional services",
    aiConfidence: "high",
    description: "Payment processing fees February 2026",
  },
  {
    id: "inv-006",
    number: "INV-2026-0147",
    issueDate: "2026-03-04",
    dueDate: "2026-03-18",
    amount: 1890.45,
    currency: "EUR",
    counterpartyId: "cp-06",
    suggestedCategory: "Travel",
    aiConfidence: "low",
    description: "Train tickets — mixed business / unclear allocation",
  },
  {
    id: "inv-007",
    number: "INV-2026-0148",
    issueDate: "2026-03-05",
    dueDate: "2026-04-04",
    amount: 3200.0,
    currency: "EUR",
    counterpartyId: "cp-07",
    suggestedCategory: "Marketing",
    aiConfidence: "high",
    description: "Brand photography & retouching",
  },
  {
    id: "inv-008",
    number: "INV-2026-0149",
    issueDate: "2026-03-05",
    dueDate: "2026-03-20",
    amount: 950.0,
    currency: "EUR",
    counterpartyId: "cp-08",
    suggestedCategory: "Professional services",
    aiConfidence: "medium",
    description: "UX audit — Phase 1 deliverable",
  },
  {
    id: "inv-009",
    number: "INV-2026-0150",
    issueDate: "2026-03-06",
    dueDate: "2026-04-05",
    amount: 14500.0,
    currency: "EUR",
    counterpartyId: "cp-09",
    suggestedCategory: "Rent",
    aiConfidence: "low",
    description: "Facility charge — could be rent or capex",
  },
  {
    id: "inv-010",
    number: "INV-2026-0151",
    issueDate: "2026-03-06",
    dueDate: "2026-03-21",
    amount: 780.2,
    currency: "EUR",
    counterpartyId: "cp-10",
    suggestedCategory: "COGS",
    aiConfidence: "high",
    description: "Marine hardware — stainless fittings",
  },
  {
    id: "inv-011",
    number: "INV-2026-0152",
    issueDate: "2026-03-07",
    dueDate: "2026-04-06",
    amount: 223.9,
    currency: "EUR",
    counterpartyId: "cp-02",
    suggestedCategory: "Utilities",
    aiConfidence: "low",
    description: "Office electricity — ambiguous period split",
  },
  {
    id: "inv-012",
    number: "INV-2026-0153",
    issueDate: "2026-03-07",
    dueDate: "2026-04-07",
    amount: 5600.0,
    currency: "EUR",
    counterpartyId: "cp-01",
    suggestedCategory: "Payroll",
    aiConfidence: "medium",
    description: "Staffing agency invoice — contractor mix",
  },
  {
    id: "inv-013",
    number: "INV-2026-0154",
    issueDate: "2026-03-08",
    dueDate: "2026-03-22",
    amount: 189.0,
    currency: "EUR",
    counterpartyId: "cp-05",
    suggestedCategory: "Software",
    aiConfidence: "high",
    description: "Billing platform usage",
  },
  {
    id: "inv-014",
    number: "INV-2026-0155",
    issueDate: "2026-03-08",
    dueDate: "2026-04-08",
    amount: 9900.0,
    currency: "EUR",
    counterpartyId: "cp-04",
    suggestedCategory: "COGS",
    aiConfidence: "high",
    description: "3PL warehousing — March slot fees",
  },
  {
    id: "inv-015",
    number: "INV-2026-0156",
    issueDate: "2026-03-09",
    dueDate: "2026-03-24",
    amount: 145.67,
    currency: "EUR",
    counterpartyId: "cp-07",
    suggestedCategory: "Marketing",
    aiConfidence: "low",
    description: "Print collateral — event vs product launch unclear",
  },
];
