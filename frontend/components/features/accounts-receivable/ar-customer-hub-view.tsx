"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { BarChart3, ChevronRight, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArCustomerCrumbBar } from "@/components/features/accounts-receivable/ar-customer-nav";
import { hubDemoFromCounterparty } from "@/lib/views/ar-counterparty-context";
import type { CounterpartyResponse } from "@/lib/schemas/organization";
import { cn } from "@/lib/utils";

const FINANCIAL_MONTH_LABELS = [
  "Nov 2025",
  "Dec 2025",
  "Jan 2026",
  "Feb 2026",
  "Mar 2026",
  "Apr 2026",
] as const;

function fmtMoney(n: number, currency: string) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatCustomerSince(isoDate: string): string {
  try {
    return format(parseISO(isoDate), "d MMMM yyyy");
  } catch {
    return isoDate;
  }
}

function spreadAcrossSixMonths(total: number): number[] {
  const n = 6;
  if (total <= 0) return Array.from({ length: n }, () => 0);
  const weights = [0.12, 0.14, 0.16, 0.18, 0.2, 0.2];
  const parts = weights.map((w) => Math.round(total * w));
  const drift = Math.round(total - parts.reduce((a, b) => a + b, 0));
  parts[n - 1] = (parts[n - 1] ?? 0) + drift;
  return parts;
}

type FinancialMetricRow = {
  key: string;
  label: string;
  monthly: (number | null)[];
  total: number | null;
  link?: boolean;
};

function buildFinancialRows(demo: ReturnType<typeof hubDemoFromCounterparty>): FinancialMetricRow[] {
  const invoicingTotal = Math.max(demo.billedThroughTabs * 3.2, 1);
  const revenueTotal = Math.max(
    Math.round(demo.billedThroughTabs * 0.42 + demo.cashCollected90d * 0.35),
    1
  );
  const deferredTotal = Math.max(Math.round(demo.revenueArr * 0.72), 1);
  const arrTotal = Math.max(demo.revenueArr, 1);

  return [
    {
      key: "revenue",
      label: "Revenue",
      monthly: spreadAcrossSixMonths(revenueTotal),
      total: revenueTotal,
      link: true,
    },
    {
      key: "invoicing",
      label: "Invoicing",
      monthly: spreadAcrossSixMonths(invoicingTotal),
      total: invoicingTotal,
      link: true,
    },
    {
      key: "deferred",
      label: "Deferred revenue",
      monthly: spreadAcrossSixMonths(deferredTotal),
      total: deferredTotal,
      link: true,
    },
    {
      key: "usage",
      label: "Usage",
      monthly: FINANCIAL_MONTH_LABELS.map(() => null),
      total: null,
      link: true,
    },
    {
      key: "arr",
      label: "ARR/MRR",
      monthly: spreadAcrossSixMonths(arrTotal),
      total: arrTotal,
      link: true,
    },
  ];
}

type HubTabProps = {
  href: string;
  label: string;
  active: boolean;
};

function HubTab({ href, label, active }: HubTabProps) {
  return (
    <Link
      href={href}
      className={cn(
        "relative inline-flex min-w-[5.5rem] flex-col items-center pb-2.5 text-sm font-medium transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span>{label}</span>
      {active ? (
        <span
          className="absolute bottom-0 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-[var(--brand-primary)] shadow-[0_0_0_2px_rgba(255,255,255,0.9)] dark:shadow-[0_0_0_2px_rgba(15,23,42,0.9)]"
          aria-hidden
        />
      ) : null}
    </Link>
  );
}

type Props = {
  counterparty: CounterpartyResponse;
};

export function ArCustomerHubView({ counterparty }: Props) {
  const pathname = usePathname();
  const demo = useMemo(
    () => hubDemoFromCounterparty(counterparty),
    [counterparty]
  );
  const customerId = counterparty.id;
  const legalName = counterparty.name;
  const productsHref = `/accounts-receivable/customers/${customerId}/products`;
  const base = `/accounts-receivable/customers/${customerId}`;

  /** This shell only mounts on the customer overview route today. */
  const isOverview = pathname === base || pathname === `${base}/`;
  const isContracts = false;
  const isInvoices = false;
  const isCreditMemos = false;

  const financialRows = useMemo(() => buildFinancialRows(demo), [demo]);

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
          <p className="mt-1 text-sm font-medium leading-snug text-muted-foreground">
            {demo.dataSourcesLine}
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

      <nav
        className="flex flex-wrap items-center justify-center gap-x-10 gap-y-2"
        aria-label="Customer profile sections"
      >
        <HubTab href={base} label="Overview" active={isOverview} />
        <HubTab
          href="/accounts-receivable/contracts"
          label="Contracts"
          active={isContracts}
        />
        <HubTab
          href="/accounts-receivable/invoices"
          label="Invoices"
          active={isInvoices}
        />
        <HubTab
          href="/accounts-receivable/credit-memos"
          label="Credit Memos"
          active={isCreditMemos}
        />
      </nav>

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
                {formatCustomerSince(demo.customerSinceDate)}
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
                Billed through Factora
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

      <section className="rounded-2xl border border-violet-200/50 bg-white px-4 py-5 shadow-sm dark:border-violet-900/40 dark:bg-slate-950 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-violet-950 dark:text-violet-100">
            Financial summary
          </h2>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Select defaultValue="demo-subsidiary">
              <SelectTrigger className="h-9 w-[min(100%,220px)] rounded-lg text-xs sm:w-[220px]">
                <SelectValue placeholder="Subsidiary" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="demo-subsidiary">1. Demo organization</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="nov-apr">
              <SelectTrigger className="h-9 w-[min(100%,200px)] rounded-lg text-xs sm:w-[200px]">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nov-apr">Nov 2025 → Apr 2026</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 hover:bg-transparent dark:border-slate-800">
                <TableHead className="min-w-[120px] whitespace-nowrap text-xs font-semibold text-muted-foreground" />
                {FINANCIAL_MONTH_LABELS.map((m) => (
                  <TableHead
                    key={m}
                    className="whitespace-nowrap text-right text-xs font-semibold text-muted-foreground"
                  >
                    {m}
                  </TableHead>
                ))}
                <TableHead className="whitespace-nowrap text-right text-xs font-bold text-foreground">
                  TOTAL
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {financialRows.map((row) => (
                <TableRow
                  key={row.key}
                  className="border-slate-100 dark:border-slate-800"
                >
                  <TableCell className="font-medium">
                    {row.link ? (
                      <button
                        type="button"
                        className="text-left text-sm font-medium text-blue-700 underline-offset-2 hover:underline dark:text-blue-400"
                      >
                        {row.label}
                      </button>
                    ) : (
                      <span className="text-sm font-medium text-foreground">
                        {row.label}
                      </span>
                    )}
                  </TableCell>
                  {row.monthly.map((v, i) => (
                    <TableCell
                      key={`${row.key}-${i}`}
                      className="text-right font-mono text-xs tabular-nums text-foreground"
                    >
                      {v == null ? "—" : fmtMoney(v, demo.currency)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-mono text-sm font-bold tabular-nums text-foreground">
                    {row.total == null ? "—" : fmtMoney(row.total, demo.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/90 bg-white px-4 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:px-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Products
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Products and pricing relevant to this customer.
            </p>
          </div>
          <Link
            href={productsHref}
            className="mt-2 inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[color:var(--brand-primary)] underline-offset-4 hover:underline sm:mt-0"
          >
            View all products
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800">
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
              {demo.productPricingRows.map((r, idx) => (
                <TableRow
                  key={`${r.product}-${idx}`}
                  className="border-slate-100 dark:border-slate-800"
                >
                  <TableCell className="font-medium">{r.product}</TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {r.pricing}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
