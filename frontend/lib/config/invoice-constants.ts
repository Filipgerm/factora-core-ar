import { SortColumn } from "@/lib/invoices/invoice-types";
import { CreditLimitRequest } from "@/lib/credit-limit-requests";

export const COLUMN_LABELS: Record<SortColumn, string> = {
  id: "Invoice",
  created: "Created",
  amount: "Amount",
  invoiceStatus: "Invoice Status",
  requestStatus: "Request Status",
  requestType: "Type",
  vat: "VAT",
};

export const CREDIT_LIMIT_EUR = 200000;
export const CURRENCY_SYMBOL = "€";
export const DRAFTS_STORAGE_KEY = "factora:draftInvoices";
export const PENDING_STORAGE_KEY = "factora:pendingInvoices";

export const requestTypeLabels: Record<
  NonNullable<CreditLimitRequest["requestType"]>,
  string
> = {
  "credit limit": "Credit Limit",
  insurance: "Insurance",
};

export const requestTypeOrder: NonNullable<
CreditLimitRequest["requestType"]
>[] = ["credit limit", "insurance"];

