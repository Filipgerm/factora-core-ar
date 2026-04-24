/**
 * Maps counterparty rows (including seeded ``ar_demo_context`` JSON) into AR UI models.
 */

import type { CounterpartyResponse } from "@/lib/schemas/organization";
import type { ArCustomer } from "@/lib/views/ar";

/** Payload shape stored in ``counterparties.ar_demo_context`` (demo seed). */
export type ArDemoContextStored = {
  ar_customer?: Partial<ArCustomer>;
  hub?: CustomerHubDemo;
  product_groups?: ProductGroupDemo[];
  product_details?: Record<string, ProductDetailDemo>;
};

export type CustomerHubDemo = {
  /** Where this customer is represented (CRM, billing, etc.). */
  dataSourcesLine: string;
  /** ISO date ``YYYY-MM-DD`` — shown as a full calendar date for “Customer since”. */
  customerSinceDate: string;
  termEndsLabel: string;
  remainingInvoices: number;
  billedThroughTabs: number;
  revenueArr: number;
  revenueNote: string;
  cashCollected90d: number;
  currency: string;
  billingSectionTitle: string;
  billingStatusLine: string;
  productPricingRows: { product: string; pricing: string }[];
};

export type ProductTierRowDemo = {
  label: string;
  price: string;
};

export type ProductRowDemo = {
  id: string;
  name: string;
  kindLabel: string;
  /** Tag color variant — Usage/Platform vs Seats in designer reference. */
  kindTone?: "usage" | "platform" | "seats";
  serviceRange: string;
  invoicingLabel: string;
  invoicingTone: "complete" | "partial";
  priceLabel: string;
  activePeriod?: boolean;
  tieredPricing?: ProductTierRowDemo[];
};

export type ProductGroupDemo = {
  id: string;
  title: string;
  rows: ProductRowDemo[];
};

export type ProductDetailDemo = {
  slug: string;
  title: string;
  summaryStrip: {
    totalContracted: number;
    pricingModel: string;
    unitPrice: number;
    qty: number;
    invoiceAmount: number;
    currency: string;
  };
  billingSchedule: {
    frequency: string;
    paymentTerms: string;
    periodLabel: string;
    billedTotal: number;
    chart: { month: string; Billed: number; Unbilled: number }[];
  };
  revenueSchedule: {
    servicePeriod: string;
    recognized: number;
    remainingLabel: string;
    chart: { month: string; Actual: number; Forecasted: number }[];
  };
};

function demoContext(cp: CounterpartyResponse): ArDemoContextStored | null {
  const raw = cp.ar_demo_context;
  if (!raw || typeof raw !== "object") return null;
  return raw as ArDemoContextStored;
}

function currencyFallback(country: string | null | undefined): string {
  if (!country) return "EUR";
  const u = country.toUpperCase();
  if (u === "US") return "USD";
  if (u === "GB" || u === "UK") return "GBP";
  return "EUR";
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Map legacy seeded ``metaLine`` copy to a short “Exists in …” line when needed. */
function dataSourcesLineFromLegacyMeta(metaLine: string): string {
  const u = metaLine.toUpperCase();
  if (u.includes("QBO") || u.includes("QUICKBOOKS") || u.includes("SALESFORCE")) {
    return "Exists in QuickBooks · Salesforce";
  }
  if (u.includes("REGISTRY")) {
    return "Exists in HubSpot · GEMI registry";
  }
  return "Exists in HubSpot";
}

function fallbackHub(
  legalName: string,
  country: string | null | undefined,
  customerCreatedAt?: Date | null
): CustomerHubDemo {
  const currency = currencyFallback(country);
  const sym = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  const since = customerCreatedAt ?? new Date();
  return {
    dataSourcesLine: `Exists in HubSpot · ${legalName}`,
    customerSinceDate: isoDate(since),
    termEndsLabel: "—",
    remainingInvoices: 0,
    billedThroughTabs: 0,
    revenueArr: 0,
    revenueNote: "Connect AR billing data",
    cashCollected90d: 0,
    currency,
    billingSectionTitle: "Billing & revenue",
    billingStatusLine: "Schedule your next invoice review in Factora.",
    productPricingRows: [
      { product: "Services", pricing: `${sym}0.00 /month` },
      { product: "Platform", pricing: `${sym}0.00 /month` },
    ],
  };
}

export function hubDemoFromCounterparty(cp: CounterpartyResponse): CustomerHubDemo {
  const base = fallbackHub(cp.name, cp.country, cp.created_at);
  const ctx = demoContext(cp);
  if (!ctx?.hub) return base;

  const raw = ctx.hub as Partial<CustomerHubDemo> &
    Record<string, unknown> & { metaLine?: string; customerSinceYear?: number };
  const { metaLine: _legacyMeta, customerSinceYear: _legacyYear, ...patch } = raw;
  const merged: CustomerHubDemo = { ...base, ...patch };

  if (
    typeof merged.dataSourcesLine !== "string" ||
    !merged.dataSourcesLine.trim()
  ) {
    merged.dataSourcesLine =
      typeof _legacyMeta === "string" && _legacyMeta.trim()
        ? dataSourcesLineFromLegacyMeta(_legacyMeta)
        : base.dataSourcesLine;
  }

  if (
    typeof merged.customerSinceDate !== "string" ||
    !merged.customerSinceDate.trim()
  ) {
    merged.customerSinceDate =
      typeof _legacyYear === "number"
        ? `${_legacyYear}-01-15`
        : base.customerSinceDate;
  }

  return merged;
}

export function productGroupsFromCounterparty(cp: CounterpartyResponse): ProductGroupDemo[] {
  const ctx = demoContext(cp);
  if (ctx?.product_groups?.length) return ctx.product_groups;
  return [];
}

export function productDetailFromCounterparty(
  cp: CounterpartyResponse,
  productSlug: string
): ProductDetailDemo | null {
  const ctx = demoContext(cp);
  const raw = ctx?.product_details?.[productSlug];
  return raw ?? null;
}

/** Merge seeded AR row overlay from ``ar_demo_context`` onto the mapped customer row. */
export function enrichArCustomerRow(
  base: ArCustomer,
  cp: CounterpartyResponse
): ArCustomer {
  const patch = demoContext(cp)?.ar_customer;
  let next: ArCustomer = patch ? ({ ...base, ...patch } as ArCustomer) : { ...base };
  if (next.paymentTerms === "—") {
    next = { ...next, paymentTerms: "Net 30" };
  }
  return next;
}
