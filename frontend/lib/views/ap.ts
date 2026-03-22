/** AP list view row types (vendors may map from counterparties). */

export type ApBillPipeline =
  | "draft"
  | "approved"
  | "scheduled"
  | "paid"
  | "overdue";

export interface ApBillRow {
  id: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  dueDate: string;
  pipeline: ApBillPipeline;
  mydataStatus: "transmitted" | "pending" | "error";
}

export type ApChargeStatus = "categorized" | "needs_review" | "needs_receipt";

export interface ApChargeRow {
  id: string;
  merchant: string;
  amount: number;
  status: ApChargeStatus;
  aiSuggestedCategory: string;
  cardLabel: string;
  teamMember: string;
}

export type ApReimbursementStatus = "submitted" | "approved" | "paid";

export interface ApReimbursementRow {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  status: ApReimbursementStatus;
  aiSuggestedCategory: string;
}

export type ApCountry = "GR" | "DE" | "NL" | "IE";

export type ApVendorBillMini = {
  id: string;
  number: string;
  amount: number;
  dueDate: string;
  status: "open" | "scheduled" | "paid";
};

export type ApVendorPaymentMini = {
  id: string;
  date: string;
  amount: string;
  method: string;
};

export interface ApVendor {
  id: string;
  name: string;
  vatNumber: string;
  country: ApCountry;
  totalApBalance: number;
  overduePayments: number;
  defaultExpenseCategory: string;
  bankDetails: string;
  trustedRecurring: boolean;
  bills: ApVendorBillMini[];
  payments: ApVendorPaymentMini[];
  avgDaysToPay: number;
}
