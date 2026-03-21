/**
 * Rich mock data for Accounts Payable list views and drill-down sheets.
 */

export type ApCountry = "GR" | "DE" | "NL" | "IE";

export type ApBillMini = {
  id: string;
  number: string;
  amount: number;
  dueDate: string;
  status: "open" | "scheduled" | "paid";
};

export type ApPaymentMini = {
  id: string;
  date: string;
  amount: string;
  method: string;
};

export type ApVendor = {
  id: string;
  name: string;
  vatNumber: string;
  country: ApCountry;
  totalApBalance: number;
  overduePayments: number;
  defaultExpenseCategory: string;
  bankDetails: string;
  trustedRecurring: boolean;
  bills: ApBillMini[];
  payments: ApPaymentMini[];
  avgDaysToPay: number;
};

export type ApBillPipeline =
  | "draft"
  | "approved"
  | "scheduled"
  | "paid"
  | "overdue";

export type ApMydataStatus = "transmitted" | "pending" | "error";

export type ApBillRow = {
  id: string;
  pipeline: ApBillPipeline;
  vendorId: string;
  vendorName: string;
  amount: number;
  dueDate: string;
  mydataStatus: ApMydataStatus;
};

export type ApChargeStatus = "categorized" | "needs_review" | "needs_receipt";

export type ApChargeRow = {
  id: string;
  merchant: string;
  amount: number;
  status: ApChargeStatus;
  aiSuggestedCategory: string;
  cardLabel: string;
  teamMember: string;
};

export type ApReimbursementStatus = "submitted" | "approved" | "paid";

export type ApReimbursementRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  status: ApReimbursementStatus;
  aiSuggestedCategory: string;
};

export type ApEmployeeMonthSummary = {
  employeeId: string;
  employeeName: string;
  monthLabel: string;
  totalSubmitted: number;
  totalApproved: number;
};

export const mockApVendors: ApVendor[] = [
  {
    id: "v1",
    name: "Ακρίδας ΑΕ",
    vatNumber: "EL094014045",
    country: "GR",
    totalApBalance: 28_420.5,
    overduePayments: 8900,
    defaultExpenseCategory: "6100 — COGS",
    bankDetails: "GR16 0110 1250 0000 0001 2300 569",
    trustedRecurring: true,
    bills: [
      {
        id: "b1",
        number: "BILL-2026-088",
        amount: 8900,
        dueDate: "2026-03-12",
        status: "open",
      },
    ],
    payments: [
      { id: "pp1", date: "2026-02-20", amount: "€12,400.00", method: "SEPA" },
    ],
    avgDaysToPay: 22,
  },
  {
    id: "v2",
    name: "Stripe Payments Europe Ltd",
    vatNumber: "IE3206488LH",
    country: "IE",
    totalApBalance: 412.18,
    overduePayments: 0,
    defaultExpenseCategory: "6300 — Payment processing",
    bankDetails: "IE29 AIBK 9311 5212 3456 78",
    trustedRecurring: true,
    bills: [],
    payments: [
      { id: "pp2", date: "2026-03-03", amount: "€412.18", method: "Card" },
    ],
    avgDaysToPay: 5,
  },
  {
    id: "v3",
    name: "Berlin Analytics GmbH",
    vatNumber: "DE334455667",
    country: "DE",
    totalApBalance: 672.33,
    overduePayments: 672.33,
    defaultExpenseCategory: "6200 — Software",
    bankDetails: "DE89 3704 0044 0532 0130 00",
    trustedRecurring: false,
    bills: [
      {
        id: "b2",
        number: "BILL-2026-091",
        amount: 672.33,
        dueDate: "2026-02-28",
        status: "open",
      },
    ],
    payments: [],
    avgDaysToPay: 41,
  },
];

export const mockApBillRows: ApBillRow[] = [
  {
    id: "ap-b1",
    pipeline: "overdue",
    vendorId: "v1",
    vendorName: "Ακρίδας ΑΕ",
    amount: 8900,
    dueDate: "2026-03-12",
    mydataStatus: "transmitted",
  },
  {
    id: "ap-b2",
    pipeline: "approved",
    vendorId: "v2",
    vendorName: "Stripe Payments Europe Ltd",
    amount: 412.18,
    dueDate: "2026-03-25",
    mydataStatus: "pending",
  },
  {
    id: "ap-b3",
    pipeline: "scheduled",
    vendorId: "v3",
    vendorName: "Berlin Analytics GmbH",
    amount: 672.33,
    dueDate: "2026-03-28",
    mydataStatus: "transmitted",
  },
  {
    id: "ap-b4",
    pipeline: "draft",
    vendorId: "v1",
    vendorName: "Ακρίδας ΑΕ",
    amount: 3200,
    dueDate: "2026-04-10",
    mydataStatus: "pending",
  },
  {
    id: "ap-b5",
    pipeline: "paid",
    vendorId: "v2",
    vendorName: "Stripe Payments Europe Ltd",
    amount: 249.9,
    dueDate: "2026-02-15",
    mydataStatus: "transmitted",
  },
];

export function apAgingBuckets(rows: ApBillRow[], now = new Date()) {
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  const endThisWeek = new Date(startOfWeek);
  endThisWeek.setDate(startOfWeek.getDate() + 6);
  const endNextWeek = new Date(endThisWeek);
  endNextWeek.setDate(endThisWeek.getDate() + 7);

  let dueThisWeek = 0;
  let dueNextWeek = 0;
  let overdue = 0;

  for (const r of rows) {
    if (r.pipeline === "paid") continue;
    const d = new Date(r.dueDate);
    if (d < now) overdue += r.amount;
    else if (d <= endThisWeek) dueThisWeek += r.amount;
    else if (d <= endNextWeek) dueNextWeek += r.amount;
  }
  return { dueThisWeek, dueNextWeek, overdue };
}

export const mockApCharges: ApChargeRow[] = [
  {
    id: "ch1",
    merchant: "AWS EMEA",
    amount: 842.11,
    status: "categorized",
    aiSuggestedCategory: "6200 — Software",
    cardLabel: "Corp · 4829",
    teamMember: "Engineering",
  },
  {
    id: "ch2",
    merchant: "Uber *TRIP",
    amount: 24.6,
    status: "needs_receipt",
    aiSuggestedCategory: "6500 — Travel",
    cardLabel: "Travel · 9912",
    teamMember: "Sales",
  },
  {
    id: "ch3",
    merchant: "UNKNOWN POS ATH",
    amount: 118.0,
    status: "needs_review",
    aiSuggestedCategory: "6400 — General",
    cardLabel: "Corp · 4829",
    teamMember: "Ops",
  },
  {
    id: "ch4",
    merchant: "OpenAI",
    amount: 120.0,
    status: "categorized",
    aiSuggestedCategory: "6200 — Software",
    cardLabel: "Corp · 4829",
    teamMember: "Engineering",
  },
];

export const mockApReimbursements: ApReimbursementRow[] = [
  {
    id: "rb1",
    employeeId: "e1",
    employeeName: "Maria K.",
    amount: 340,
    status: "submitted",
    aiSuggestedCategory: "6500 — Travel",
  },
  {
    id: "rb2",
    employeeId: "e2",
    employeeName: "Nikos P.",
    amount: 89.5,
    status: "approved",
    aiSuggestedCategory: "6600 — Meals",
  },
  {
    id: "rb3",
    employeeId: "e1",
    employeeName: "Maria K.",
    amount: 1200,
    status: "paid",
    aiSuggestedCategory: "6100 — COGS",
  },
];

export const mockApReimbursementSummaries: ApEmployeeMonthSummary[] = [
  {
    employeeId: "e1",
    employeeName: "Maria K.",
    monthLabel: "March 2026",
    totalSubmitted: 1540,
    totalApproved: 1200,
  },
  {
    employeeId: "e2",
    employeeName: "Nikos P.",
    monthLabel: "March 2026",
    totalSubmitted: 89.5,
    totalApproved: 89.5,
  },
];

export const AP_CATEGORY_OPTIONS = [
  "6200 — Software",
  "6100 — COGS",
  "6500 — Travel",
  "6600 — Meals",
  "6400 — General",
] as const;
