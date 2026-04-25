"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { ChevronRight, Upload } from "lucide-react";

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
import {
  formatProductInvoiceProgress,
  hubDemoFromCounterparty,
  isProductInvoiceProgressComplete,
  productGroupsFromCounterparty,
  productKindTagClass,
  splitProductPriceLabel,
  type ProductRowDemo,
} from "@/lib/views/ar-counterparty-context";
import { LEDGER_TABLE_BODY_ROW } from "@/lib/ledger-table-row-styles";
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
  const locale = currency === "USD" ? "en-US" : "en-IE";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
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
  if (demo.financialSummaryRows?.length) {
    return demo.financialSummaryRows.map((r) => ({
      key: r.key,
      label: r.label,
      monthly: [...r.monthly],
      total: r.total,
      link: r.link ?? true,
    }));
  }

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

function flattenProductRows(counterparty: CounterpartyResponse): ProductRowDemo[] {
  return productGroupsFromCounterparty(counterparty).flatMap((g) => g.rows);
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
  const subsidiaryLabel = demo.subsidiarySelectLabel ?? "1. Demo organization";
  const catalogRows = useMemo(
    () => flattenProductRows(counterparty),
    [counterparty]
  );

  return (
    <div className="space-y-6">
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {legalName}
          </h1>
          <p className="mt-1 text-sm font-medium leading-snug text-slate-950 dark:text-slate-50">
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

      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">
            Financial summary
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:shrink-0">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-sm font-medium text-slate-950 dark:text-slate-50">
                Subsidiary
              </span>
              <Select defaultValue="demo-subsidiary">
                <SelectTrigger className="h-9 w-[min(100%,220px)] rounded-lg text-xs sm:w-[220px]">
                  <SelectValue placeholder="Subsidiary" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demo-subsidiary">{subsidiaryLabel}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-sm font-medium text-slate-950 dark:text-slate-50">
                Select dates:
              </span>
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
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
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
              {financialRows.map((row) => {
                const dash = row.key === "usage" ? "-" : "—";
                return (
                  <TableRow
                    key={row.key}
                    className={cn(LEDGER_TABLE_BODY_ROW, "dark:border-slate-800")}
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
                        {v == null ? dash : fmtMoney(v, demo.currency)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-mono text-sm font-bold tabular-nums text-foreground">
                      {row.total == null ? dash : fmtMoney(row.total, demo.currency)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-5">
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
        <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 hover:bg-transparent dark:border-slate-800">
                <TableHead className="text-xs font-semibold">Product</TableHead>
                <TableHead className="text-right text-xs font-semibold">
                  {"Service & billing"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalogRows.length > 0
                ? catalogRows.map((row) => {
                    const href = `${base}/products/${row.id}`;
                    const { amount: priceAmount, suffix: priceSuffix } =
                      splitProductPriceLabel(row.priceLabel);
                    const invoiceLine = formatProductInvoiceProgress(row);
                    const invoiceComplete = isProductInvoiceProgressComplete(row);
                    return (
                      <TableRow
                        key={row.id}
                        className={cn(
                          LEDGER_TABLE_BODY_ROW,
                          "cursor-pointer border-slate-100 p-0 dark:border-slate-800"
                        )}
                      >
                        <TableCell colSpan={2} className="p-0">
                          <Link
                            href={href}
                            className="flex flex-col gap-3 px-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex min-w-0 items-start gap-3">
                              <span
                                className="mt-1 inline-flex size-4 shrink-0 items-center justify-center rounded-sm border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-950"
                                aria-hidden
                              />
                              <div className="min-w-0 text-left">
                                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                  <span className="font-semibold text-foreground">
                                    {row.name}
                                  </span>
                                  <span className={productKindTagClass(row.kindTone)}>
                                    {row.kindLabel}
                                  </span>
                                </div>
                                <p className="mt-2 flex items-center gap-1.5 text-xs text-foreground">
                                  {row.activePeriod ? (
                                    <span
                                      className="size-2.5 shrink-0 rounded-full bg-emerald-500"
                                      aria-hidden
                                    />
                                  ) : (
                                    <span
                                      className="size-2.5 shrink-0 rounded-full border-2 border-slate-300 bg-transparent dark:border-slate-500"
                                      aria-hidden
                                    />
                                  )}
                                  <span>{row.serviceRange}</span>
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-start gap-2 sm:ml-auto sm:min-w-0 sm:flex-row sm:items-center sm:justify-end sm:gap-6">
                              <span
                                className={cn(
                                  "text-xs font-medium tabular-nums sm:text-right",
                                  invoiceComplete
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-foreground"
                                )}
                              >
                                {invoiceLine}
                              </span>
                              <p className="text-right font-mono text-sm tabular-nums sm:whitespace-nowrap">
                                <span className="font-semibold text-foreground">
                                  {priceAmount}
                                </span>
                                {priceSuffix ? (
                                  <span className="text-xs font-normal text-muted-foreground">
                                    {priceSuffix}
                                  </span>
                                ) : null}
                              </p>
                            </div>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })
                : demo.productPricingRows.map((r, idx) => (
                    <TableRow
                      key={`${r.product}-${idx}`}
                      className={cn(LEDGER_TABLE_BODY_ROW, "dark:border-slate-800")}
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
      </div>
    </div>
  );
}
