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
  /** AI-normalized merchant / counterparty label */
  merchant: string;
  /** Raw narrative as it appears on the bank statement (POS / SEPA text) */
  rawDescriptor: string;
  /** ≤4 words; minimal subline under merchant in the ledger */
  payerHint: string;
  bankId: ReconciliationBankId;
  maskedAccount: string;
  memo?: string;
}

export type ReconciliationInvoiceRole = "AR" | "AP";

/** Drives the Type column icon in the reconciliation ledger */
export type ReconciliationInvoiceCategory =
  | "subscription"
  | "services"
  | "travel"
  | "fee"
  | "receivable"
  | "payable"
  | "logistics"
  | "other";

/** Vendor / Customer / Other column */
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
  /** Suggested or posted GL mapping for the book side */
  glAccount: string;
  invoiceCategory: ReconciliationInvoiceCategory;
  counterpartyKind: ReconciliationCounterpartyKind;
  /** Short ledger line: reference, PO, period, or memo (not full metadata stack) */
  invoiceSummary: string;
}

export interface ReconciliationPendingPair {
  id: string;
  transaction: ReconciliationBankTransaction;
  invoice: ReconciliationBookInvoice;
  /** Optional extra open invoices for split / 1-to-many matching (includes primary or alternatives). */
  matchCandidates?: ReconciliationBookInvoice[];
  aiConfidencePercent: number;
  aiReasoning: string;
  /** Short line for match reasoning tooltip (e.g. exact amount + invoice ref). */
  matchLogicSummary?: string;
}

export interface ReconciliationAutoMatchedPair {
  id: string;
  transaction: ReconciliationBankTransaction;
  invoice: ReconciliationBookInvoice;
  matchLogicSummary?: string;
}

/** Mock aggregate for reconciliation header metric. */
export const MOCK_RECON_AUTO_MATCHED_COUNT = 142;

export const mockReconciliationPendingPairs: ReconciliationPendingPair[] = [
  {
    id: "rec-pend-01",
    transaction: {
      id: "btx-101",
      date: "2026-03-10",
      amount: -2499.0,
      currency: "EUR",
      merchant: "SALESFORCE INC",
      rawDescriptor:
        "POS PURCHASE SALESFORCE.COM SAN FRANCISCO US 10MAR EUR 2499.00 AUTH 991204",
      payerHint: "Corporate card charge",
      bankId: "revolut",
      maskedAccount: "•••• 8821",
      memo: "Card payment",
    },
    invoice: {
      id: "rap-01",
      invoiceNumber: "AP-INV-8841",
      dueDate: "2026-03-12",
      counterpartyName: "Meridian Cloud Ltd",
      totalAmount: 2499.0,
      currency: "EUR",
      role: "AP",
      status: "Open",
      glAccount: "62810 — Software & SaaS",
      invoiceCategory: "subscription",
      counterpartyKind: "vendor",
      invoiceSummary: "FY26 CRM seat renewal",
    },
    aiConfidencePercent: 88,
    aiReasoning:
      "AI confidence: 88%. Exact amount match (€2,499.00) and vendor string aligns with posted Salesforce subscription.",
    matchLogicSummary:
      "Matched by: Exact amount (€2,499.00) and invoice reference (#AP-INV-8841).",
    matchCandidates: [
      {
        id: "rap-01",
        invoiceNumber: "AP-INV-8841",
        dueDate: "2026-03-12",
        counterpartyName: "Meridian Cloud Ltd",
        totalAmount: 2499.0,
        currency: "EUR",
        role: "AP",
        status: "Open",
        glAccount: "62810 — Software & SaaS",
        invoiceCategory: "subscription",
        counterpartyKind: "vendor",
        invoiceSummary: "FY26 CRM seat renewal",
      },
      {
        id: "rap-01a",
        invoiceNumber: "AP-INV-8841-A",
        dueDate: "2026-03-12",
        counterpartyName: "Meridian Cloud Ltd",
        totalAmount: 1500.0,
        currency: "EUR",
        role: "AP",
        status: "Open",
        glAccount: "62810 — Software & SaaS",
        invoiceCategory: "subscription",
        counterpartyKind: "vendor",
        invoiceSummary: "FY26 seats (installment 1)",
      },
      {
        id: "rap-01b",
        invoiceNumber: "AP-INV-8841-B",
        dueDate: "2026-03-12",
        counterpartyName: "Meridian Cloud Ltd",
        totalAmount: 999.0,
        currency: "EUR",
        role: "AP",
        status: "Open",
        glAccount: "62810 — Software & SaaS",
        invoiceCategory: "subscription",
        counterpartyKind: "vendor",
        invoiceSummary: "FY26 seats (installment 2)",
      },
    ],
  },
  {
    id: "rec-pend-02",
    transaction: {
      id: "btx-102",
      date: "2026-03-08",
      amount: -672.33,
      currency: "EUR",
      merchant: "BERLIN ANALYTICS GMBH",
      rawDescriptor:
        "SEPA DD BERLIN ANALYTICS GMBH REF 2026-03-INV-8842 ENDTOEND NOTPROVIDED",
      payerHint: "SEPA direct debit",
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
      glAccount: "40110 — Subscription Revenue",
      invoiceCategory: "subscription",
      counterpartyKind: "customer",
      invoiceSummary: "March analytics service fee",
    },
    aiConfidencePercent: 72,
    aiReasoning:
      "AI confidence: 72%. Amount matches exactly; merchant name aligns with counterparty. Bank date is 7 days before invoice due date — possible early payment or different document.",
    matchCandidates: [
      {
        id: "rar-02",
        invoiceNumber: "AR-2026-0198",
        dueDate: "2026-03-15",
        counterpartyName: "Berlin Analytics GmbH",
        totalAmount: 672.33,
        currency: "EUR",
        role: "AR",
        status: "Open",
        glAccount: "40110 — Subscription Revenue",
        invoiceCategory: "subscription",
        counterpartyKind: "customer",
        invoiceSummary: "March analytics service fee",
      },
    ],
  },
  {
    id: "rec-pend-03",
    transaction: {
      id: "btx-103",
      date: "2026-03-09",
      amount: -1890.45,
      currency: "EUR",
      merchant: "COGNITIVE LEGAL LLP",
      rawDescriptor:
        "SEPA DD COGNITIVE LEGAL LLP LONDON REF RET-2026-Q1 INV 1890.45 GBP FX",
      payerHint: "Legal retainer debit",
      bankId: "deutschebank",
      maskedAccount: "•••• 9910",
      memo: "Legal retainer",
    },
    invoice: {
      id: "rap-03",
      invoiceNumber: "LEG-RET-Q1-26",
      dueDate: "2026-03-20",
      counterpartyName: "Cognitive Legal LLP",
      totalAmount: 1890.45,
      currency: "EUR",
      role: "AP",
      status: "Open",
      glAccount: "62100 — Professional Fees",
      invoiceCategory: "services",
      counterpartyKind: "vendor",
      invoiceSummary: "Q1 outside counsel retainer",
    },
    aiConfidencePercent: 65,
    aiReasoning:
      "AI confidence: 65%. Amount matches quarterly retainer; bank value date differs from invoice date — confirm accrual period.",
  },
  {
    id: "rec-pend-04",
    transaction: {
      id: "btx-104",
      date: "2026-03-11",
      amount: 5600.0,
      currency: "EUR",
      merchant: "NORTHERN SUPPLY CO LTD",
      rawDescriptor:
        "INSTANT IN NORTHERN SUPPLY CO LTD REF ERP-AR-5600/11MAR26 BENEF REF 99821",
      payerHint: "Inbound SEPA credit",
      bankId: "piraeus",
      maskedAccount: "•••• 1204",
      memo: "Incoming transfer",
    },
    invoice: {
      id: "rar-04",
      invoiceNumber: "AR-2026-0201",
      dueDate: "2026-03-11",
      counterpartyName: "Northern Supply Co Ltd",
      totalAmount: 5600.0,
      currency: "EUR",
      role: "AR",
      status: "Overdue",
      glAccount: "12000 — Trade Receivables",
      invoiceCategory: "receivable",
      counterpartyKind: "customer",
      invoiceSummary: "Hardware deposit open AR",
    },
    aiConfidencePercent: 81,
    aiReasoning:
      "AI confidence: 81%. Inbound amount matches open AR; corporate name matches beneficiary reference.",
  },
  {
    id: "rec-pend-05",
    transaction: {
      id: "btx-105",
      date: "2026-03-07",
      amount: -145.67,
      currency: "EUR",
      merchant: "STRIPE PAYMENTS EU",
      rawDescriptor:
        "POS PUR STRIPE*PAYMENTS EU DUBLIN IE 07MAR 145.67 EUR CD 7733XXXX9012",
      payerHint: "Card presentment fee",
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
      glAccount: "65320 — Payment Processing Fees",
      invoiceCategory: "fee",
      counterpartyKind: "vendor",
      invoiceSummary: "March card fee settlement",
    },
    aiConfidencePercent: 58,
    aiReasoning:
      "AI confidence: 58%. Amount matches a known processing fee pattern, but invoice period end is 24 days after bank debit — flag for human confirmation.",
  },
  {
    id: "rec-pend-06",
    transaction: {
      id: "btx-106",
      date: "2026-03-12",
      amount: -890.0,
      currency: "EUR",
      merchant: "AWS EMEA",
      rawDescriptor:
        "CARD AMAZON WEB SERVICES AWS.AMAZON.CO UK 12MAR 890.00 EUR",
      payerHint: "Cloud infrastructure charge",
      bankId: "revolut",
      maskedAccount: "•••• 8821",
    },
    invoice: {
      id: "rap-06",
      invoiceNumber: "AP-CLOUD-2403",
      dueDate: "2026-03-18",
      counterpartyName: "Amazon Web Services EMEA SARL",
      totalAmount: 890.0,
      currency: "EUR",
      role: "AP",
      status: "Open",
      glAccount: "62810 — Cloud Infrastructure",
      invoiceCategory: "subscription",
      counterpartyKind: "vendor",
      invoiceSummary: "March AWS usage charges",
    },
    aiConfidencePercent: 45,
    aiReasoning:
      "AI confidence: 45%. Amount matches typical AWS billing cadence but invoice number pattern differs from prior months — needs review.",
  },
  {
    id: "rec-pend-07",
    transaction: {
      id: "btx-107",
      date: "2026-03-11",
      amount: 2200.0,
      currency: "EUR",
      merchant: "VERTEX ANALYTICS BV",
      rawDescriptor:
        "SEPA INST VERTEX ANALYTICS BV AMSTERDAM REF AR-MAR-2200/2026 BENEF REF 77102",
      payerHint: "Inbound SEPA credit",
      bankId: "eurobank",
      maskedAccount: "•••• 7733",
    },
    invoice: {
      id: "rar-07",
      invoiceNumber: "AR-2026-0210",
      dueDate: "2026-03-18",
      counterpartyName: "Vertex Analytics BV",
      totalAmount: 2200.0,
      currency: "EUR",
      role: "AR",
      status: "Open",
      glAccount: "12000 — Trade Receivables",
      invoiceCategory: "receivable",
      counterpartyKind: "customer",
      invoiceSummary: "Milestone two wire payment",
    },
    aiConfidencePercent: 76,
    aiReasoning:
      "AI confidence: 76%. Inbound wire matches open AR; beneficiary matches Vertex Analytics.",
  },
  {
    id: "rec-pend-08",
    transaction: {
      id: "btx-108",
      date: "2026-03-06",
      amount: -124.5,
      currency: "EUR",
      merchant: "GOOGLE*GSUITE",
      rawDescriptor:
        "POS GOOGLE *GSUITE G.CO/HELPPAY# IE 06MAR 124.50 EUR",
      payerHint: "SaaS subscription charge",
      bankId: "n26",
      maskedAccount: "•••• 4402",
    },
    invoice: {
      id: "rap-08",
      invoiceNumber: "AP-GOOG-031",
      dueDate: "2026-03-20",
      counterpartyName: "Google Ireland Ltd",
      totalAmount: 124.5,
      currency: "EUR",
      role: "AP",
      status: "Open",
      glAccount: "62810 — Software & SaaS",
      invoiceCategory: "subscription",
      counterpartyKind: "vendor",
      invoiceSummary: "Licensed user seats March",
    },
    aiConfidencePercent: 92,
    aiReasoning:
      "AI confidence: 92%. Recurring Workspace charge; amount and merchant token align with posted AP.",
  },
  {
    id: "rec-pend-09",
    transaction: {
      id: "btx-109",
      date: "2026-03-05",
      amount: -4500.0,
      currency: "EUR",
      merchant: "UNKNOWN SEPA BENEFICIARY",
      rawDescriptor:
        "SEPA CT UNKNOWN BENEFICIARY REF BATCH-4500 ENDTOEND NOTPROVIDED",
      payerHint: "Outbound SEPA transfer",
      bankId: "deutschebank",
      maskedAccount: "•••• 9910",
    },
    invoice: {
      id: "rap-09",
      invoiceNumber: "AP-TEMP-009",
      dueDate: "2026-03-25",
      counterpartyName: "Unmatched counterparty",
      totalAmount: 4500.0,
      currency: "EUR",
      role: "AP",
      status: "Open",
      glAccount: "99990 — Suspense",
      invoiceCategory: "other",
      counterpartyKind: "other",
      invoiceSummary: "Suspense pending vendor match",
    },
    aiConfidencePercent: 38,
    aiReasoning:
      "AI confidence: 38%. Amount only; beneficiary text does not match any open vendor — high ambiguity.",
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
        rawDescriptor:
          "CARD STRIPE TECHNOLOGY EU LTD DUBLIN 06MAR412.18EUR AUTH STRP*INV-8840",
        payerHint: "Card processing fee",
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
        glAccount: "65320 — Payment Processing Fees",
        invoiceCategory: "fee",
        counterpartyKind: "vendor",
        invoiceSummary: "Stripe presentment fee batch",
      },
      matchLogicSummary:
        "Matched by: Exact amount (€412.18) and card auth string (STRP*INV-8840).",
    },
    {
      id: "rec-auto-02",
      transaction: {
        id: "btx-202",
        date: "2026-03-05",
        amount: -3200.0,
        currency: "EUR",
        merchant: "BRIGHTLEAF DIGITAL INC",
        rawDescriptor:
          "SEPA CT BRIGHTLEAF DIGITAL INC CHICAGO REF AP-MKT-112/2026 ENDTOEND US12CHI...",
        payerHint: "Agency invoice payment",
        bankId: "piraeus",
        maskedAccount: "•••• 1204",
      },
      invoice: {
        id: "rap-auto-02",
        invoiceNumber: "AP-MKT-112",
        dueDate: "2026-03-05",
        counterpartyName: "Brightleaf Digital Inc",
        totalAmount: 3200.0,
        currency: "EUR",
        role: "AP",
        status: "Open",
        glAccount: "62000 — Marketing & Advertising",
        invoiceCategory: "services",
        counterpartyKind: "vendor",
        invoiceSummary: "Paid social campaign March",
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
        rawDescriptor:
          "INCOMING SEPA ATHENS LOGISTICS SA REF INV-AR-2026-0188 TRN EBC77330044921",
        payerHint: "Inbound customer payment",
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
        glAccount: "40110 — Subscription Revenue",
        invoiceCategory: "receivable",
        counterpartyKind: "customer",
        invoiceSummary: "Partial subscription receipt",
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
        rawDescriptor:
          "SEPA DD ATHENS LOGISTICS SA ELPP CUSTOMS CLEAR 12890.00 REF AP-LOG-9901",
        payerHint: "Customs clearance debit",
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
        glAccount: "62850 — Logistics & Customs",
        invoiceCategory: "logistics",
        counterpartyKind: "vendor",
        invoiceSummary: "Port customs clearance fees",
      },
    },
    {
      id: "rec-auto-05",
      transaction: {
        id: "btx-205",
        date: "2026-03-02",
        amount: -199.0,
        currency: "EUR",
        merchant: "NOTION LABS",
        rawDescriptor:
          "CARD NOTION LABS INC SAN FRANCISCO 02MAR199.00EUR",
        payerHint: "Software subscription charge",
        bankId: "n26",
        maskedAccount: "•••• 4402",
      },
      invoice: {
        id: "rap-auto-05",
        invoiceNumber: "AP-NOT-0226",
        dueDate: "2026-03-02",
        counterpartyName: "Notion Labs Inc",
        totalAmount: 199.0,
        currency: "EUR",
        role: "AP",
        status: "Open",
        glAccount: "62810 — Software & SaaS",
        invoiceCategory: "subscription",
        counterpartyKind: "vendor",
        invoiceSummary: "Notion team plan renewal",
      },
    },
    {
      id: "rec-auto-06",
      transaction: {
        id: "btx-206",
        date: "2026-03-01",
        amount: 3100.0,
        currency: "EUR",
        merchant: "CLOUDSCALE OY",
        rawDescriptor:
          "INCOMING SEPA CLOUDSCALE OY HELSINKI REF INV-AR-3100",
        payerHint: "Inbound customer payment",
        bankId: "revolut",
        maskedAccount: "•••• 8821",
      },
      invoice: {
        id: "rar-auto-06",
        invoiceNumber: "AR-2026-0175",
        dueDate: "2026-03-01",
        counterpartyName: "Cloudscale Oy",
        totalAmount: 3100.0,
        currency: "EUR",
        role: "AR",
        status: "Open",
        glAccount: "40110 — Subscription Revenue",
        invoiceCategory: "receivable",
        counterpartyKind: "customer",
        invoiceSummary: "Annual prepayment SaaS receipt",
      },
    },
    {
      id: "rec-auto-07",
      transaction: {
        id: "btx-207",
        date: "2026-02-28",
        amount: -78.2,
        currency: "EUR",
        merchant: "HEROKU SALES",
        rawDescriptor:
          "CARD HEROKU* SALES SAN FRANCISCO 28FEB 78.20 EUR",
        payerHint: "PaaS subscription charge",
        bankId: "eurobank",
        maskedAccount: "•••• 7733",
      },
      invoice: {
        id: "rap-auto-07",
        invoiceNumber: "AP-HEROKU-0228",
        dueDate: "2026-02-28",
        counterpartyName: "Salesforce Heroku Inc",
        totalAmount: 78.2,
        currency: "EUR",
        role: "AP",
        status: "Open",
        glAccount: "62810 — Software & SaaS",
        invoiceCategory: "subscription",
        counterpartyKind: "vendor",
        invoiceSummary: "February dyno usage charges",
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
  /** Subtle AI glow / gradient treatment */
  aiRelated?: boolean;
}

export interface HomeKpiSparkPoint {
  i: number;
  v: number;
}

/** How to format the animated numeric value */
export type HomeKpiFormatKey =
  | "eur_millions"
  | "eur_integer"
  | "months_1dp";

export interface HomeKpiMetric {
  id: string;
  title: string;
  /** Layout tier: primary = large hero KPIs (ARR, outstanding AR) */
  tier: "primary" | "secondary";
  /** Numeric target for count-up animation */
  animateTarget: number;
  formatKey: HomeKpiFormatKey;
  changePercent: number;
  comparisonLabel: string;
  sparkline: HomeKpiSparkPoint[];
  /** e.g. "As of 31 Jan 2026" */
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
  /** ISO timestamp */
  at: string;
  message: string;
  icon: HomeActivityIcon;
}

export const mockHomeUserFirstName = "Filip";

export const mockHomeActionItems: HomeActionItem[] = [
  {
    id: "act-01",
    label: "Invoices pending approval",
    count: 3,
    href: "/ledger?filter=review",
    urgency: "attention",
    aiRelated: true,
  },
  {
    id: "act-02",
    label: "Unmatched bank lines",
    count: 5,
    href: "/reconciliation?filter=unmatched",
    urgency: "default",
    aiRelated: true,
  },
  {
    id: "act-03",
    label: "Overdue AR nudges to review",
    count: 2,
    href: "/accounts-receivable/customers",
    urgency: "critical",
    aiRelated: true,
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
    id: "kpi-arr",
    title: "ARR",
    tier: "primary",
    animateTarget: 4.24,
    formatKey: "eur_millions",
    changePercent: 11.2,
    comparisonLabel: "vs prior month",
    asOfLabel: "As of 31 Jan 2026",
    sparkline: [
      { i: 0, v: 3.2 },
      { i: 1, v: 3.35 },
      { i: 2, v: 3.5 },
      { i: 3, v: 3.72 },
      { i: 4, v: 3.9 },
      { i: 5, v: 4.05 },
      { i: 6, v: 4.24 },
    ],
  },
  {
    id: "kpi-oar",
    title: "Outstanding AR",
    tier: "primary",
    animateTarget: 892_450,
    formatKey: "eur_integer",
    changePercent: -3.8,
    comparisonLabel: "vs prior month",
    asOfLabel: "As of 31 Jan 2026",
    sparkline: [
      { i: 0, v: 980 },
      { i: 1, v: 965 },
      { i: 2, v: 940 },
      { i: 3, v: 930 },
      { i: 4, v: 915 },
      { i: 5, v: 905 },
      { i: 6, v: 892 },
    ],
  },
  {
    id: "kpi-runway",
    title: "Runway",
    tier: "secondary",
    animateTarget: 9.2,
    formatKey: "months_1dp",
    changePercent: 4.5,
    comparisonLabel: "vs prior month",
    sparkline: [
      { i: 0, v: 7.8 },
      { i: 1, v: 8.0 },
      { i: 2, v: 8.2 },
      { i: 3, v: 8.5 },
      { i: 4, v: 8.7 },
      { i: 5, v: 8.95 },
      { i: 6, v: 9.2 },
    ],
  },
  {
    id: "kpi-net-burn",
    title: "Net burn",
    tier: "secondary",
    animateTarget: 151_200,
    formatKey: "eur_integer",
    changePercent: -6.2,
    comparisonLabel: "vs prior month",
    sparkline: [
      { i: 0, v: 168 },
      { i: 1, v: 165 },
      { i: 2, v: 162 },
      { i: 3, v: 158 },
      { i: 4, v: 156 },
      { i: 5, v: 154 },
      { i: 6, v: 151 },
    ],
  },
  {
    id: "kpi-cash",
    title: "Cash balance",
    tier: "secondary",
    animateTarget: 1_180_000,
    formatKey: "eur_integer",
    changePercent: 8.1,
    comparisonLabel: "vs prior month",
    sparkline: [
      { i: 0, v: 980 },
      { i: 1, v: 1020 },
      { i: 2, v: 1050 },
      { i: 3, v: 1080 },
      { i: 4, v: 1120 },
      { i: 5, v: 1150 },
      { i: 6, v: 1180 },
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
