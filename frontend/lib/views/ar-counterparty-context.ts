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
  metaLine: string;
  customerSinceYear: number;
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

export type ProductRowDemo = {
  id: string;
  name: string;
  kindLabel: string;
  serviceRange: string;
  invoicingLabel: string;
  invoicingTone: "complete" | "partial";
  priceLabel: string;
  activePeriod?: boolean;
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

function fallbackHub(legalName: string, country: string | null | undefined): CustomerHubDemo {
  const currency = currencyFallback(country);
  const sym = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  return {
    metaLine: `${legalName.toUpperCase()} · NO DEMO CONTEXT`,
    customerSinceYear: new Date().getFullYear(),
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
  const ctx = demoContext(cp);
  if (ctx?.hub) return ctx.hub;
  return fallbackHub(cp.name, cp.country);
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
