import { Invoice, RequestStatus, InvoiceRequestDetails } from "./invoice-types";
import { CreditLimitRequest } from "@/lib/credit-limit-requests";
import { CUSTOMERS_DATA } from "@/lib/customers-data";
import businessByVatData from "@/lib/data/business-by-vat.json";

// Helper function to parse invoice amount string to number
export function parseAmount(amountString: string): number {
  // Remove currency symbols and whitespace, then parse
  const cleaned = amountString.replace(/[€$,\s]/g, "");
  return parseFloat(cleaned) || 0;
}

// Helper function to parse date string (format: "MMM DD, YYYY")
export function parseDate(dateString: string): Date {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const parts = dateString.split(", ");
  if (parts.length !== 2) return new Date(0);

  const datePart = parts[0].split(" ");
  const year = parseInt(parts[1], 10);
  const month = monthNames.indexOf(datePart[0]);
  const day = parseInt(datePart[1], 10);

  if (month === -1 || isNaN(day) || isNaN(year)) return new Date(0);
  return new Date(year, month, day);
}

/**
 * Determine request metadata for an invoice based on credit limit requests
 */
export function getRequestDetailsForInvoice(
  invoiceId: string,
  creditLimitRequests: CreditLimitRequest[]
): InvoiceRequestDetails {
  // Find requests that include this invoice
  const relevantRequests = creditLimitRequests.filter((req) =>
    req.invoiceIds.includes(invoiceId)
  );

  if (relevantRequests.length === 0) {
    return { requestStatus: "Not Requested" };
  }

  // Check if any request has been accepted
  const approvedRequest = relevantRequests.find((req) => req.acceptedAt);
  if (approvedRequest) {
    return {
      requestStatus: "Approved",
      requestType: approvedRequest.requestType,
    };
  }

  // Check if any request has been rejected (check for rejectedAt field)
  // Note: This field may not exist in the type yet, but we support it
  const rejectedRequest = relevantRequests.find((req: any) => req.rejectedAt);
  if (rejectedRequest) {
    return {
      requestStatus: "Rejected",
      requestType: rejectedRequest.requestType,
    };
  }

  // If request exists but not accepted/rejected, it's pending
  const latestRequest = [...relevantRequests].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;
    return bTime - aTime;
  })[0];

  return {
    requestStatus: "Pending",
    requestType: latestRequest?.requestType,
  };
}

export function normalizeDrafts(input: any): Invoice[] {
  const allowed: Invoice["status"][] = [
    "Paid",
    "Pending",
    "Defaulted",
    "Draft",
  ];
  const isAllowed = (s: any): s is Invoice["status"] => allowed.includes(s);
  if (!Array.isArray(input)) return [];
  return input.filter(Boolean).map((x) => ({
    id: String(x.id || "INV-unknown"),
    created: String(x.created || ""),
    amount: String(x.amount || "€0.00"),
    status: isAllowed(x.status) ? x.status : "Draft",
    requestStatus: (x.requestStatus as RequestStatus) || "Not Requested",
    requestType:
      (x.requestType as CreditLimitRequest["requestType"]) || undefined,
    vat: x.vat ? String(x.vat) : undefined,
    customerVat: x.customerVat ? String(x.customerVat) : undefined,
    businessName: x.businessName ? String(x.businessName) : undefined,
    businessAddressLines: Array.isArray(x.businessAddressLines)
      ? x.businessAddressLines.map((l: any) => String(l))
      : undefined,
    businessEmail: x.businessEmail ? String(x.businessEmail) : undefined,
    businessPhone: x.businessPhone ? String(x.businessPhone) : undefined,
  }));
}

export function normalizePendings(input: any): Invoice[] {
  // Same shape as drafts, but status should be Pending
  if (!Array.isArray(input)) return [];
  return input.filter(Boolean).map((x) => ({
    id: String(x.id || "INV-unknown"),
    created: String(x.created || ""),
    amount: String(x.amount || "€0.00"),
    status: "Pending" as const,
    requestStatus: (x.requestStatus as RequestStatus) || "Not Requested",
    requestType:
      (x.requestType as CreditLimitRequest["requestType"]) || undefined,
    vat: x.vat ? String(x.vat) : undefined,
    customerVat: x.customerVat ? String(x.customerVat) : undefined,
    businessName: x.businessName ? String(x.businessName) : undefined,
    businessAddressLines: Array.isArray(x.businessAddressLines)
      ? x.businessAddressLines.map((l: any) => String(l))
      : undefined,
    businessEmail: x.businessEmail ? String(x.businessEmail) : undefined,
    businessPhone: x.businessPhone ? String(x.businessPhone) : undefined,
  }));
}

// Get business name from invoice data or CUSTOMERS_DATA
export function getBusinessName(
  vat: string | undefined,
  allInvoices: Invoice[]
): string {
  if (!vat) return "Unknown Business";

  // First, try to get from invoice data
  const invoiceWithVat = allInvoices.find((inv) => inv.vat === vat);
  if (invoiceWithVat?.businessName) {
    return invoiceWithVat.businessName;
  }

  // Then, try to get from businessByVat
  const businessByVat = businessByVatData as Record<
    string,
    {
      name: string;
      addressLines: string[];
      email: string;
      phone: string;
    }
  >;
  if (businessByVat[vat]) {
    return businessByVat[vat].name;
  }

  // Finally, try to get from CUSTOMERS_DATA
  const customer = CUSTOMERS_DATA.find((c) => c.vatNumber === vat);
  if (customer) {
    return customer.businessName;
  }

  return "Unknown Business";
}

