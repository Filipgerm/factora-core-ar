/**
 * Demo narrative data for AR customer hub / products / product detail (Tabs-style).
 * Keys match seeded counterparty UUIDs from organization_counterparties.json.
 */

import type { ArCustomer } from "@/lib/views/ar";

/** List table enrichment — merged over API-mapped rows for designer demos */
export const AR_CUSTOMER_LIST_OVERLAY: Partial<
  Record<string, Partial<ArCustomer>>
> = {
  "f6a7b8c9-d0e1-42f3-a4b5-c6d7e8f90101": {
    totalOutstanding: 48250,
    overdueAmount: 0,
    dsoDays: 28,
    paymentTerms: "Net 30",
    lastPaymentDate: "2025-03-15",
    aging: { current: 48250, d1_30: 0, d31_60: 0, d60plus: 0 },
    invoices: [
      { id: "inv-dc-1", number: "INV-24089", amount: 3500 },
      { id: "inv-dc-2", number: "INV-24102", amount: 8200 },
    ],
    payments: [
      {
        id: "pay-dc-1",
        date: "2025-03-15",
        amount: "€12,400.00",
        method: "ACH",
      },
    ],
  },
  "f6a7b8c9-d0e1-42f3-a4b5-c6d7e8f90102": {
    totalOutstanding: 12100,
    overdueAmount: 2100,
    dsoDays: 41,
    paymentTerms: "Net 14",
    lastPaymentDate: "2025-02-01",
    aging: { current: 8000, d1_30: 2100, d31_60: 2000, d60plus: 0 },
    invoices: [],
    payments: [],
  },
  "f6a7b8c9-d0e1-42f3-a4b5-c6d7e8f90103": {
    totalOutstanding: 8940,
    overdueAmount: 0,
    dsoDays: 22,
    paymentTerms: "Net 30",
    lastPaymentDate: "2025-03-28",
    aging: { current: 8940, d1_30: 0, d31_60: 0, d60plus: 0 },
    invoices: [],
    payments: [],
  },
  "f6a7b8c9-d0e1-42f3-a4b5-c6d7e8f90104": {
    totalOutstanding: 15680,
    overdueAmount: 1200,
    dsoDays: 35,
    paymentTerms: "Net 45",
    lastPaymentDate: "2025-02-18",
    aging: { current: 12000, d1_30: 1200, d31_60: 2480, d60plus: 0 },
    invoices: [],
    payments: [],
  },
  "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c01": {
    totalOutstanding: 22400,
    overdueAmount: 0,
    dsoDays: 31,
    paymentTerms: "Net 30",
    lastPaymentDate: "2025-03-10",
    aging: { current: 22400, d1_30: 0, d31_60: 0, d60plus: 0 },
    invoices: [],
    payments: [],
  },
  "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a05": {
    totalOutstanding: 5600,
    overdueAmount: 0,
    dsoDays: 18,
    paymentTerms: "Net 14",
    lastPaymentDate: "2025-04-01",
    aging: { current: 5600, d1_30: 0, d31_60: 0, d60plus: 0 },
    invoices: [],
    payments: [],
  },
};

export function enrichArCustomerRow(c: ArCustomer): ArCustomer {
  const patch = AR_CUSTOMER_LIST_OVERLAY[c.id];
  if (!patch) {
    const terms =
      c.paymentTerms === "—" ? ("Net 30" as const) : c.paymentTerms;
    return { ...c, paymentTerms: terms };
  }
  return { ...c, ...patch };
}

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

const DC_ID = "f6a7b8c9-d0e1-42f3-a4b5-c6d7e8f90101";

const HUB_FALLBACK = (
  name: string,
  currency: string = "EUR"
): CustomerHubDemo => ({
  metaLine: `CREATED ${new Date().toLocaleDateString("en-IE", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()} · DEMO DATA`,
  customerSinceYear: 2024,
  termEndsLabel: "—",
  remainingInvoices: 3,
  billedThroughTabs: 18500,
  revenueArr: 48000,
  revenueNote: "Contracted annual value (demo)",
  cashCollected90d: 9200,
  currency,
  billingSectionTitle: "Billing & revenue",
  billingStatusLine: "Schedule your next invoice review in Factora.",
  productPricingRows: [
    { product: "Platform subscription", pricing: `${currency === "EUR" ? "€" : "$"}2,500.00 /month` },
    { product: "Professional services", pricing: `${currency === "EUR" ? "€" : "$"}180.00 /hour` },
  ],
});

export function getCustomerHubDemo(
  customerId: string,
  legalName: string,
  country: string
): CustomerHubDemo {
  const currency =
    country === "US" ? "USD" : ["GB", "UK"].includes(country) ? "GBP" : "EUR";

  if (customerId === DC_ID) {
    return {
      metaLine:
        "CREATED APR 17, 2025 BY QBO · EXISTS IN QBO, SALESFORCE (demo)",
      customerSinceYear: 2025,
      termEndsLabel: "May 1, 2026",
      remainingInvoices: 7,
      billedThroughTabs: 61250,
      revenueArr: 42000,
      revenueNote: "ARR from last uploaded contract (May 2025)",
      cashCollected90d: 0,
      currency: "USD",
      billingSectionTitle: "Billing & revenue — adjust line items and modify schedules",
      billingStatusLine: "Last invoice from Oct 1, 2025 is sent",
      productPricingRows: [
        { product: "Professional Services", pricing: "$200.00 /month" },
        { product: "Core Platform", pricing: "$3,000.00 /month" },
        { product: "Core Platform", pricing: "$3,500.00 /month" },
      ],
    };
  }

  return HUB_FALLBACK(legalName, currency);
}

export function getCustomerProductGroups(customerId: string): ProductGroupDemo[] {
  if (customerId === DC_ID) {
    return [
      {
        id: "og-dc",
        title: "Digital Consulting Order form",
        rows: [
          {
            id: "core-platform-legacy",
            name: "Core Platform",
            kindLabel: "Platform",
            serviceRange: "Service May 1 '24 – Apr 30 '25",
            invoicingLabel: "12 of 12 invoiced",
            invoicingTone: "complete",
            priceLabel: "$3,000.00 /mo",
          },
          {
            id: "professional-services-legacy",
            name: "Professional Services",
            kindLabel: "Service",
            serviceRange: "Service May 1 '24 – Apr 30 '25",
            invoicingLabel: "12 of 12 invoiced",
            invoicingTone: "complete",
            priceLabel: "$200.00 /unit/mo",
          },
        ],
      },
      {
        id: "og-dc-renewal",
        title: "Renewal_Digital Consulting Order form",
        rows: [
          {
            id: "core-platform-renewal",
            name: "Core Platform",
            kindLabel: "Platform",
            serviceRange: "Service May 1 '25 – Apr 30 '26",
            invoicingLabel: "6 of 12 invoiced",
            invoicingTone: "partial",
            priceLabel: "$3,500.00 /mo",
            activePeriod: true,
          },
          {
            id: "professional-services-renewal",
            name: "Professional Services",
            kindLabel: "Service",
            serviceRange: "Service May 1 '25 – Apr 30 '26",
            invoicingLabel: "5 of 12 invoiced",
            invoicingTone: "partial",
            priceLabel: "$250.00 /unit/mo",
            activePeriod: true,
          },
        ],
      },
    ];
  }

  return [
    {
      id: "og-generic",
      title: "Subscription & services",
      rows: [
        {
          id: "generic-platform",
          name: "Platform subscription",
          kindLabel: "Subscription",
          serviceRange: "Rolling annual",
          invoicingLabel: "Aligned to schedule",
          invoicingTone: "partial",
          priceLabel: "€2,500.00 /mo",
          activePeriod: true,
        },
      ],
    },
  ];
}

const MONTHS_DC = [
  "May '24",
  "Jun '24",
  "Jul '24",
  "Aug '24",
  "Sep '24",
  "Oct '24",
  "Nov '24",
  "Dec '24",
  "Jan '25",
  "Feb '25",
  "Mar '25",
  "Apr '25",
];

function chartRowsFlat(): {
  billing: { month: string; Billed: number; Unbilled: number }[];
  revenue: { month: string; Actual: number; Forecasted: number }[];
} {
  const billing = MONTHS_DC.map((month) => ({
    month,
    Billed: 3000,
    Unbilled: 0,
  }));
  const revenue = MONTHS_DC.map((month) => ({
    month,
    Actual: 3000,
    Forecasted: 0,
  }));
  return { billing, revenue };
}

export function getProductDetailDemo(
  customerId: string,
  productSlug: string
): ProductDetailDemo | null {
  const groups = getCustomerProductGroups(customerId);
  const slugs = new Map<string, ProductRowDemo>();
  for (const g of groups) {
    for (const r of g.rows) {
      slugs.set(r.id, r);
    }
  }
  const row = slugs.get(productSlug);
  if (!row) return null;

  const { billing, revenue } = chartRowsFlat();

  if (customerId === DC_ID && productSlug === "professional-services-legacy") {
    return {
      slug: productSlug,
      title: row.name,
      summaryStrip: {
        totalContracted: 36000,
        pricingModel: "Flat price",
        unitPrice: 200,
        qty: 15,
        invoiceAmount: 3000,
        currency: "USD",
      },
      billingSchedule: {
        frequency: "Monthly (Starts May 1, 2024)",
        paymentTerms: "Net 30",
        periodLabel: "May 1 '24 – Apr 30 '25 (12 invoices)",
        billedTotal: 36000,
        chart: billing,
      },
      revenueSchedule: {
        servicePeriod: "May 1 '24 – Apr 30 '25",
        recognized: 36000,
        remainingLabel: "—",
        chart: revenue,
      },
    };
  }

  const amt = (() => {
    const l = row.priceLabel;
    if (l.includes("3,500")) return 3500;
    if (l.includes("3,000")) return 3000;
    if (l.includes("250.00")) return 250;
    if (l.includes("200.00")) return 200;
    return 2500;
  })();
  const detailCurrency = customerId === DC_ID ? "USD" : "EUR";
  return {
    slug: productSlug,
    title: row.name,
    summaryStrip: {
      totalContracted: amt * 12,
      pricingModel: "Recurring",
      unitPrice: amt,
      qty: 1,
      invoiceAmount: amt,
      currency: detailCurrency,
    },
    billingSchedule: {
      frequency: "Monthly",
      paymentTerms: "Net 30",
      periodLabel: "Annual cycle (demo)",
      billedTotal: amt * 12,
      chart: MONTHS_DC.map((month) => ({
        month,
        Billed: amt,
        Unbilled: 0,
      })),
    },
    revenueSchedule: {
      servicePeriod: "Aligned billing",
      recognized: amt * 12,
      remainingLabel: "—",
      chart: MONTHS_DC.map((month) => ({
        month,
        Actual: amt,
        Forecasted: 0,
      })),
    },
  };
}
