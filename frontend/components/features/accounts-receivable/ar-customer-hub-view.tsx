"use client";

import Link from "next/link";
import { BarChart3, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArCustomerCrumbBar } from "@/components/features/accounts-receivable/ar-customer-nav";
import { getCustomerHubDemo } from "@/lib/views/ar-customer-demo-data";
import type { ArCountry } from "@/lib/views/ar";
import { cn } from "@/lib/utils";

function fmtMoney(n: number, currency: string) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

type Props = {
  customerId: string;
  legalName: string;
  country: ArCountry;
};

export function ArCustomerHubView({
  customerId,
  legalName,
  country,
}: Props) {
  const demo = getCustomerHubDemo(customerId, legalName, country);
  const productsHref = `/accounts-receivable/customers/${customerId}/products`;

  return (
    <div className="space-y-6">
      <ArCustomerCrumbBar
        segments={[
          { label: "Customer", href: "/accounts-receivable/customers" },
          { label: legalName },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {legalName}
          </h1>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {demo.metaLine}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="transition-all duration-200"
            type="button"
          >
            <Upload className="mr-1.5 size-3.5" aria-hidden />
            Upload document
          </Button>
          <Button variant="secondary" size="sm" type="button">
            Settings &amp; more
          </Button>
        </div>
      </div>

      <section
        className={cn(
          "rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50/95 via-purple-50/80 to-[var(--brand-primary-subtle)] px-5 py-5 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.08)] dark:border-violet-900/50 dark:from-violet-950/40 dark:via-purple-950/30 dark:to-teal-950/20 sm:px-8 sm:py-6"
        )}
      >
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-violet-900/70 dark:text-violet-200/80">
                Customer since
              </dt>
              <dd className="mt-1 font-semibold text-violet-950 dark:text-violet-50">
                {demo.customerSinceYear}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-violet-900/70 dark:text-violet-200/80">
                Term ends
              </dt>
              <dd className="mt-1 font-semibold text-violet-950 dark:text-violet-50">
                {demo.termEndsLabel}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-violet-900/70 dark:text-violet-200/80">
                Remaining bills
              </dt>
              <dd className="mt-1 font-semibold text-violet-950 dark:text-violet-50">
                {demo.remainingInvoices} invoices
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-violet-900/70 dark:text-violet-200/80">
                Billed through Tabs
              </dt>
              <dd className="mt-1 font-semibold tabular-nums text-violet-950 dark:text-violet-50">
                {fmtMoney(demo.billedThroughTabs, demo.currency)}
              </dd>
            </div>
          </dl>
          <div className="space-y-4 border-t border-violet-200/50 pt-4 lg:border-l lg:border-t-0 lg:pt-0 lg:pl-10 dark:border-violet-800/40">
            <div className="flex gap-2">
              <BarChart3 className="mt-0.5 size-4 shrink-0 text-[color:var(--brand-primary)]" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-900/70 dark:text-violet-200/80">
                  Revenue
                </p>
                <p className="mt-1 text-sm text-violet-950 dark:text-violet-100">
                  ARR is{" "}
                  <span className="font-semibold tabular-nums">
                    {fmtMoney(demo.revenueArr, demo.currency)}
                  </span>{" "}
                  ({demo.revenueNote})
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <BarChart3 className="mt-0.5 size-4 shrink-0 text-[color:var(--brand-primary)]" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-900/70 dark:text-violet-200/80">
                  Cash collected
                </p>
                <p className="mt-1 text-sm text-violet-950 dark:text-violet-100">
                  <span className="font-semibold tabular-nums">
                    {fmtMoney(demo.cashCollected90d, demo.currency)}
                  </span>{" "}
                  in the last 90 days
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,220px)_1fr] lg:gap-12">
        <aside className="space-y-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-amber-900/80 dark:text-amber-200/90">
            {demo.billingSectionTitle}
          </h2>
          <p className="text-xs font-medium text-[color:var(--brand-primary)] transition-colors duration-200">
            <Link href="/accounts-receivable/invoices">{demo.billingStatusLine}</Link>
          </p>
          <nav className="flex flex-col gap-4 border-t border-slate-200/80 pt-4 dark:border-slate-800">
            <div>
              <Link
                href={productsHref}
                className="text-sm font-semibold text-foreground underline decoration-slate-300 underline-offset-4 transition-colors duration-200 hover:text-[color:var(--brand-primary)]"
              >
                Products
              </Link>
              <p className="mt-1 text-xs text-muted-foreground">
                Billable products and revenue recognition
              </p>
            </div>
            <div>
              <Link
                href="/accounts-receivable/invoices"
                className="text-sm font-semibold text-foreground underline decoration-slate-300 underline-offset-4 transition-colors duration-200 hover:text-[color:var(--brand-primary)]"
              >
                Invoices (demo)
              </Link>
              <p className="mt-1 text-xs text-muted-foreground">
                Open and posted invoices for this customer
              </p>
            </div>
          </nav>
        </aside>

        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 hover:bg-transparent dark:border-slate-800">
                <TableHead className="text-xs font-semibold">Product</TableHead>
                <TableHead className="text-right text-xs font-semibold">
                  Pricing
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demo.productPricingRows.map((row, idx) => (
                <TableRow
                  key={`${row.product}-${idx}`}
                  className="border-slate-100 dark:border-slate-800"
                >
                  <TableCell className="font-medium">{row.product}</TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {row.pricing}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
