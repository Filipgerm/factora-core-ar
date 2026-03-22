import type { CounterpartyResponse } from "@/lib/schemas/organization";
import type { ApCountry, ApVendor } from "@/lib/views/ap";
import type { ArCountry, ArCustomer } from "@/lib/views/ar";

function asArCountry(c: string | null | undefined): ArCountry {
  const u = (c ?? "GR").toUpperCase();
  if (u === "GR" || u === "DE" || u === "NL" || u === "FR" || u === "IE")
    return u;
  return "GR";
}

function asApCountry(c: string | null | undefined): ApCountry {
  const u = (c ?? "GR").toUpperCase();
  if (u === "GR" || u === "DE" || u === "NL" || u === "IE") return u;
  return "GR";
}

export function isCustomerType(type: string): boolean {
  const t = type.toLowerCase();
  return t === "customer" || t === "both";
}

export function isVendorType(type: string): boolean {
  const t = type.toLowerCase();
  return t === "vendor" || t === "both";
}

export function counterpartyToArCustomer(c: CounterpartyResponse): ArCustomer {
  const vat = c.vat_number?.trim() ?? "";
  return {
    id: c.id,
    legalName: c.name,
    vatNumber: vat || "—",
    country: asArCountry(c.country),
    totalOutstanding: 0, // TODO: Phase 3 Backend — AR balance per counterparty
    overdueAmount: 0,
    dsoDays: 0,
    paymentTerms: "—", // TODO: Phase 3 Backend
    lastPaymentDate: null,
    aging: { current: 0, d1_30: 0, d31_60: 0, d60plus: 0 },
    invoices: [],
    payments: [],
  };
}

export function counterpartyToApVendor(c: CounterpartyResponse): ApVendor {
  const vat = c.vat_number?.trim() ?? "";
  return {
    id: c.id,
    name: c.name,
    vatNumber: vat || "—",
    country: asApCountry(c.country),
    totalApBalance: 0, // TODO: Phase 3 Backend
    overduePayments: 0,
    defaultExpenseCategory: "—", // TODO: Phase 3 Backend
    bankDetails: "—", // TODO: Phase 3 Backend
    trustedRecurring: false,
    bills: [],
    payments: [],
    avgDaysToPay: 0, // TODO: Phase 3 Backend
  };
}
