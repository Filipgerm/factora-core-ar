import { CreditLimitRequest } from "@/lib/credit-limit-requests";

export type RequestStatus = "Approved" | "Rejected" | "Pending" | "Not Requested";

export type SortColumn =
  | "id"
  | "created"
  | "amount"
  | "invoiceStatus"
  | "requestStatus"
  | "requestType"
  | "vat";

export type SortDirection = "asc" | "desc";

export type Invoice = {
  id: string;
  created: string;
  amount: string;
  status: "Paid" | "Pending" | "Defaulted" | "Draft";
  requestStatus?: RequestStatus;
  requestType?: CreditLimitRequest["requestType"];
  vat?: string;
  customerVat?: string;
  businessName?: string;
  businessAddressLines?: string[];
  businessEmail?: string;
  businessPhone?: string;
};

export type RequestOutcomeSummary = Record<
  NonNullable<CreditLimitRequest["requestType"]>,
  {
    approved: number;
    rejected: number;
  }
>;

export type RequestOutcomeDonutEntry = {
  key: string;
  name: string;
  value: number;
  color: string;
  percentage: number;
};

export type InvoiceRequestDetails = {
  requestStatus: RequestStatus;
  requestType?: CreditLimitRequest["requestType"];
};

