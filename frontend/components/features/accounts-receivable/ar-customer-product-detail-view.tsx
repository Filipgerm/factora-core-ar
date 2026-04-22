"use client";

import Link from "next/link";
import { Package, Pencil } from "lucide-react";
import { BarChart } from "@tremor/react";

import { Button } from "@/components/ui/button";
import { ArCustomerCrumbBar } from "@/components/features/accounts-receivable/ar-customer-nav";
import { getProductDetailDemo } from "@/lib/views/ar-customer-demo-data";
import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";

type Props = {
  customerId: string;
  legalName: string;
  productSlug: string;
};

function fmtChart(n: number, currency: string) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function ArCustomerProductDetailView({
  customerId,
  legalName,
  productSlug,
}: Props) {
  const base = `/accounts-receivable/customers/${customerId}`;
  const demo = getProductDetailDemo(customerId, productSlug);

  if (!demo) {
    return (
      <FeatureEmptyState
        icon={Package}
        title="Product not found"
        description="This demo product slug is not defined for this customer."
        ctaHref={`/accounts-receivable/customers/${customerId}/products`}
        ctaLabel="Back to products"
      />
    );
  }

  const cur = demo.summaryStrip.currency;

  return (
    <div className="space-y-10 pb-16">
      <ArCustomerCrumbBar
        segments={[
          { label: "Customer", href: "/accounts-receivable/customers" },
          { label: legalName, href: base },
          { label: "Products", href: `${base}/products` },
          { label: demo.title },
        ]}
      />

      <section className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-5 py-5 dark:border-slate-800 dark:bg-slate-900/40 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{demo.title}</h1>
            <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Total contracted
                </p>
                <p className="font-semibold tabular-nums">
                  {fmtChart(demo.summaryStrip.totalContracted, cur)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Pricing
                </p>
                <p className="font-semibold">{demo.summaryStrip.pricingModel}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Unit price
              </p>
              <p className="font-mono font-semibold tabular-nums">
                {fmtChart(demo.summaryStrip.unitPrice, cur)}
              </p>
            </div>
            <span className="text-muted-foreground" aria-hidden>
              ×
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Qty
              </p>
              <p className="font-semibold tabular-nums">{demo.summaryStrip.qty}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Invoice amount
              </p>
              <p className="font-mono font-semibold tabular-nums">
                {fmtChart(demo.summaryStrip.invoiceAmount, cur)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Billing schedule</h2>
          <Button
            size="sm"
            variant="secondary"
            className="border border-teal-200/60 bg-[var(--brand-primary-subtle)] text-xs text-foreground hover:bg-[var(--brand-primary-subtle)] dark:border-teal-800/50"
            type="button"
            disabled
          >
            <Pencil className="mr-1.5 size-3.5" aria-hidden />
            Edit billing
          </Button>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <BarChart
            className="h-72"
            data={demo.billingSchedule.chart}
            index="month"
            categories={["Billed", "Unbilled"]}
            colors={["teal", "slate"]}
            yAxisWidth={56}
            valueFormatter={(v) => fmtChart(Number(v), cur)}
            showLegend
          />
        </div>
        <dl className="grid gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
          <div>
            <dt className="text-xs text-muted-foreground">Billing period</dt>
            <dd className="mt-1 font-medium">{demo.billingSchedule.periodLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Frequency</dt>
            <dd className="mt-1 font-medium">{demo.billingSchedule.frequency}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Payment terms</dt>
            <dd className="mt-1 font-medium">{demo.billingSchedule.paymentTerms}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Billed</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {fmtChart(demo.billingSchedule.billedTotal, cur)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-4 scroll-mt-8" id="revenue-schedule">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Revenue schedule</h2>
          <Button
            size="sm"
            variant="secondary"
            className="border border-teal-200/60 bg-[var(--brand-primary-subtle)] text-xs text-foreground hover:bg-[var(--brand-primary-subtle)] dark:border-teal-800/50"
            type="button"
            disabled
          >
            <Pencil className="mr-1.5 size-3.5" aria-hidden />
            Edit revenue
          </Button>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <BarChart
            className="h-72"
            data={demo.revenueSchedule.chart}
            index="month"
            categories={["Actual", "Forecasted"]}
            colors={["rose", "pink"]}
            yAxisWidth={56}
            valueFormatter={(v) => fmtChart(Number(v), cur)}
            showLegend
          />
        </div>
        <dl className="grid gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3 dark:border-slate-800">
          <div>
            <dt className="text-xs text-muted-foreground">Service period</dt>
            <dd className="mt-1 font-semibold">{demo.revenueSchedule.servicePeriod}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Recognized</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {fmtChart(demo.revenueSchedule.recognized, cur)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Remaining</dt>
            <dd className="mt-1 font-medium text-muted-foreground">
              {demo.revenueSchedule.remainingLabel}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          Scroll this page to compare billing recognition vs revenue recognition for the
          same service window (demo).
        </p>
      </section>

      <div className="flex justify-start border-t border-slate-100 pt-6 dark:border-slate-800">
        <Button variant="outline" size="sm" asChild>
          <Link href={`${base}/products`}>← Back to products</Link>
        </Button>
      </div>
    </div>
  );
}
