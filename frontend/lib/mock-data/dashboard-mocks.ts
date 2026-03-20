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

/* -----------------------------------------------------------------------------
   Reconciliation (bank ↔ AR/AP) — Phase 2
   ----------------------------------------------------------------------------- */

export type ReconciliationBankId =
  | "eurobank"
  | "revolut"
  | "n26"
  | "deutschebank"
  | "piraeus";

export interface ReconciliationBankTransaction {
  id: string;
  /** ISO date */
  date: string;
  amount: number;
  currency: "EUR";
  merchant: string;
  bankId: ReconciliationBankId;
  maskedAccount: string;
  memo?: string;
}

export type ReconciliationInvoiceRole = "AR" | "AP";

export interface ReconciliationBookInvoice {
  id: string;
  invoiceNumber: string;
  dueDate: string;
  counterpartyName: string;
  totalAmount: number;
  currency: "EUR";
  role: ReconciliationInvoiceRole;
  status: "Open" | "Overdue" | "Partial";
}

export interface ReconciliationPendingPair {
  id: string;
  transaction: ReconciliationBankTransaction;
  invoice: ReconciliationBookInvoice;
  aiConfidencePercent: number;
  aiReasoning: string;
}

export interface ReconciliationAutoMatchedPair {
  id: string;
  transaction: ReconciliationBankTransaction;
  invoice: ReconciliationBookInvoice;
}

export const mockReconciliationPendingPairs: ReconciliationPendingPair[] = [
  {
    id: "rec-pend-01",
    transaction: {
      id: "btx-101",
      date: "2026-03-10",
      amount: -2499.0,
      currency: "EUR",
      merchant: "GITHUB INC",
      bankId: "revolut",
      maskedAccount: "•••• 8821",
      memo: "Card payment",
    },
    invoice: {
      id: "rap-01",
      invoiceNumber: "AP-INV-8841",
      dueDate: "2026-03-12",
      counterpartyName: "Orpheus Cloud IKE",
      totalAmount: 2499.0,
      currency: "EUR",
      role: "AP",
      status: "Open",
    },
    aiConfidencePercent: 88,
    aiReasoning:
      "AI confidence: 88%. Exact amount match (€2,499.00) and vendor string similarity (GitHub vs Orpheus hosting context). Invoice due date is 2 days after bank posting — within tolerance.",
  },
  {
    id: "rec-pend-02",
    transaction: {
      id: "btx-102",
      date: "2026-03-08",
      amount: -672.33,
      currency: "EUR",
      merchant: "BERLIN ANALYTICS GMBH",
      bankId: "n26",
      maskedAccount: "•••• 4402",
    },
    invoice: {
      id: "rar-02",
      invoiceNumber: "AR-2026-0198",
      dueDate: "2026-03-15",
      counterpartyName: "Berlin Analytics GmbH",
      totalAmount: 672.33,
      currency: "EUR",
      role: "AR",
      status: "Open",
    },
    aiConfidencePercent: 72,
    aiReasoning:
      "AI confidence: 72%. Amount matches exactly; merchant name aligns with counterparty. Bank date is 7 days before invoice due date — possible early payment or different document.",
  },
  {
    id: "rec-pend-03",
    transaction: {
      id: "btx-103",
      date: "2026-03-09",
      amount: -1890.45,
      currency: "EUR",
      merchant: "DEUTSCHE BAHN AG",
      bankId: "deutschebank",
      maskedAccount: "•••• 9910",
      memo: "ICE tickets",
    },
    invoice: {
      id: "rap-03",
      invoiceNumber: "EXP-TR-2203",
      dueDate: "2026-03-20",
      counterpartyName: "Deutsche Bahn AG",
      totalAmount: 1890.45,
      currency: "EUR",
      role: "AP",
      status: "Open",
    },
    aiConfidencePercent: 65,
    aiReasoning:
      "AI confidence: 65%. Same amount and legal entity name. Travel expense classification uncertain — dates differ by 11 days; please confirm this is the same trip batch.",
  },
  {
    id: "rec-pend-04",
    transaction: {
      id: "btx-104",
      date: "2026-03-11",
      amount: 5600.0,
      currency: "EUR",
      merchant: "ΑΚΡΙΔΑΣ ΑΕ",
      bankId: "piraeus",
      maskedAccount: "•••• 1204",
      memo: "Incoming transfer",
    },
    invoice: {
      id: "rar-04",
      invoiceNumber: "AR-2026-0201",
      dueDate: "2026-03-11",
      counterpartyName: "Ακρίδας ΑΕ",
      totalAmount: 5600.0,
      currency: "EUR",
      role: "AR",
      status: "Overdue",
    },
    aiConfidencePercent: 81,
    aiReasoning:
      "AI confidence: 81%. Inbound amount matches open AR; Greek legal name normalized from statement descriptor. Verify IBAN beneficiary matches Ακρίδας ΑΕ.",
  },
  {
    id: "rec-pend-05",
    transaction: {
      id: "btx-105",
      date: "2026-03-07",
      amount: -145.67,
      currency: "EUR",
      merchant: "STRIPE PAYMENTS EU",
      bankId: "eurobank",
      maskedAccount: "•••• 7733",
    },
    invoice: {
      id: "rap-05",
      invoiceNumber: "FEE-MAR-026",
      dueDate: "2026-03-31",
      counterpartyName: "Stripe Payments Europe Ltd",
      totalAmount: 145.67,
      currency: "EUR",
      role: "AP",
      status: "Open",
    },
    aiConfidencePercent: 58,
    aiReasoning:
      "AI confidence: 58%. Amount matches a known processing fee pattern, but invoice period end is 24 days after bank debit — flag for human confirmation.",
  },
];

export const mockReconciliationAutoMatchedPairs: ReconciliationAutoMatchedPair[] =
  [
    {
      id: "rec-auto-01",
      transaction: {
        id: "btx-201",
        date: "2026-03-06",
        amount: -412.18,
        currency: "EUR",
        merchant: "STRIPE PAYMENTS",
        bankId: "revolut",
        maskedAccount: "•••• 8821",
      },
      invoice: {
        id: "rap-auto-01",
        invoiceNumber: "AP-ST-8840",
        dueDate: "2026-03-06",
        counterpartyName: "Stripe Payments Europe Ltd",
        totalAmount: 412.18,
        currency: "EUR",
        role: "AP",
        status: "Open",
      },
    },
    {
      id: "rec-auto-02",
      transaction: {
        id: "btx-202",
        date: "2026-03-05",
        amount: -3200.0,
        currency: "EUR",
        merchant: "ΦΩΤΟΔΕΝΤΡΟ ΙΚΕ",
        bankId: "piraeus",
        maskedAccount: "•••• 1204",
      },
      invoice: {
        id: "rap-auto-02",
        invoiceNumber: "AP-MKT-112",
        dueDate: "2026-03-05",
        counterpartyName: "Φωτόδεντρο Μονοπρόσωπη ΙΚΕ",
        totalAmount: 3200.0,
        currency: "EUR",
        role: "AP",
        status: "Open",
      },
    },
    {
      id: "rec-auto-03",
      transaction: {
        id: "btx-203",
        date: "2026-03-04",
        amount: 9900.0,
        currency: "EUR",
        merchant: "ATHENS LOGISTICS SA",
        bankId: "eurobank",
        maskedAccount: "•••• 7733",
      },
      invoice: {
        id: "rar-auto-03",
        invoiceNumber: "AR-2026-0188",
        dueDate: "2026-03-04",
        counterpartyName: "Athens Logistics SA",
        totalAmount: 9900.0,
        currency: "EUR",
        role: "AR",
        status: "Partial",
      },
    },
    {
      id: "rec-auto-04",
      transaction: {
        id: "btx-204",
        date: "2026-03-03",
        amount: -12890.0,
        currency: "EUR",
        merchant: "CUSTOMS / PORT FEES",
        bankId: "piraeus",
        maskedAccount: "•••• 1204",
        memo: "SEPA debit",
      },
      invoice: {
        id: "rap-auto-04",
        invoiceNumber: "AP-LOG-9901",
        dueDate: "2026-03-03",
        counterpartyName: "Athens Logistics SA",
        totalAmount: 12890.0,
        currency: "EUR",
        role: "AP",
        status: "Open",
      },
    },
  ];

/* -----------------------------------------------------------------------------
   Home dashboard — Agentic command center
   ----------------------------------------------------------------------------- */

export type HomeActionUrgency = "default" | "attention" | "critical";

export interface HomeActionItem {
  id: string;
  /** Short label, e.g. "Uncategorized transactions" */
  label: string;
  count: number;
  href: string;
  urgency: HomeActionUrgency;
}

export interface HomeKpiSparkPoint {
  i: number;
  v: number;
}

export interface HomeKpiMetric {
  id: string;
  title: string;
  /** Pre-formatted display value */
  valueDisplay: string;
  changePercent: number;
  /** e.g. "vs last month" */
  comparisonLabel: string;
  sparkline: HomeKpiSparkPoint[];
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
  /** ISO timestamp */
  at: string;
  message: string;
  icon: HomeActivityIcon;
}

export const mockHomeUserFirstName = "Filip";

export const mockHomeActionItems: HomeActionItem[] = [
  {
    id: "act-01",
    label: "Uncategorized transactions",
    count: 3,
    href: "/ledger",
    urgency: "attention",
  },
  {
    id: "act-02",
    label: "Invoices pending reconciliation",
    count: 5,
    href: "/reconciliation",
    urgency: "default",
  },
  {
    id: "act-03",
    label: "Overdue AR nudges to review",
    count: 2,
    href: "/ar-collections",
    urgency: "critical",
  },
  {
    id: "act-04",
    label: "Bank connections need refresh",
    count: 1,
    href: "/integrations",
    urgency: "attention",
  },
];

export const mockHomeKpiMetrics: HomeKpiMetric[] = [
  {
    id: "kpi-cash",
    title: "Net cash flow (30d)",
    valueDisplay: "€184,200",
    changePercent: 12.4,
    comparisonLabel: "vs prior month",
    sparkline: [
      { i: 0, v: 120 },
      { i: 1, v: 132 },
      { i: 2, v: 128 },
      { i: 3, v: 145 },
      { i: 4, v: 158 },
      { i: 5, v: 172 },
      { i: 6, v: 184 },
    ],
  },
  {
    id: "kpi-ar",
    title: "Total outstanding AR",
    valueDisplay: "€892,450",
    changePercent: -4.1,
    comparisonLabel: "vs prior month",
    sparkline: [
      { i: 0, v: 980 },
      { i: 1, v: 965 },
      { i: 2, v: 940 },
      { i: 3, v: 920 },
      { i: 4, v: 910 },
      { i: 5, v: 902 },
      { i: 6, v: 892 },
    ],
  },
  {
    id: "kpi-ap",
    title: "Total pending AP",
    valueDisplay: "€241,880",
    changePercent: 6.8,
    comparisonLabel: "vs prior month",
    sparkline: [
      { i: 0, v: 210 },
      { i: 1, v: 218 },
      { i: 2, v: 225 },
      { i: 3, v: 230 },
      { i: 4, v: 235 },
      { i: 5, v: 238 },
      { i: 6, v: 242 },
    ],
  },
  {
    id: "kpi-runway",
    title: "Cash runway",
    valueDisplay: "9.2 mo",
    changePercent: 3.2,
    comparisonLabel: "vs prior month",
    sparkline: [
      { i: 0, v: 8.1 },
      { i: 1, v: 8.3 },
      { i: 2, v: 8.4 },
      { i: 3, v: 8.6 },
      { i: 4, v: 8.8 },
      { i: 5, v: 9.0 },
      { i: 6, v: 9.2 },
    ],
  },
];

export const mockHomeActivityFeed: HomeActivityItem[] = [
  {
    id: "feed-01",
    at: "2026-03-20T09:14:00.000Z",
    message: 'Agent categorized "SPOTIFY AB" as Software',
    icon: "sparkles",
  },
  {
    id: "feed-02",
    at: "2026-03-20T08:52:00.000Z",
    message: "Stripe payout reconciled to AR-2026-0188",
    icon: "git-merge",
  },
  {
    id: "feed-03",
    at: "2026-03-20T08:10:00.000Z",
    message: "New GEMI registry data synced for Ακρίδας ΑΕ",
    icon: "building",
  },
  {
    id: "feed-04",
    at: "2026-03-19T17:22:00.000Z",
    message: "Invoice INV-2026-0156 flagged for human category review",
    icon: "file-text",
  },
  {
    id: "feed-05",
    at: "2026-03-19T15:05:00.000Z",
    message: "Collections agent drafted follow-up for Orpheus Cloud IKE",
    icon: "mail",
  },
  {
    id: "feed-06",
    at: "2026-03-19T11:40:00.000Z",
    message: "SEPA import validated — 42 transactions ingested",
    icon: "badge-check",
  },
  {
    id: "feed-07",
    at: "2026-03-19T09:00:00.000Z",
    message: "Cash position snapshot exported to CSV",
    icon: "banknote",
  },
];
