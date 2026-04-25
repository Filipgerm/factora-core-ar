"use client";

import Link from "next/link";
import {
  ArrowUpDown,
  ChevronDown,
  Circle,
  Filter,
  MoreVertical,
  Package,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";
import { LEDGER_TABLE_BODY_ROW } from "@/lib/ledger-table-row-styles";
import type { CounterpartyResponse } from "@/lib/schemas/organization";
import {
  formatProductInvoiceProgress,
  isProductInvoiceProgressComplete,
  productGroupsFromCounterparty,
  productKindTagClass,
  splitProductPriceLabel,
  type ProductGroupDemo,
  type ProductRowDemo,
} from "@/lib/views/ar-counterparty-context";
import { cn } from "@/lib/utils";

type Props = {
  counterparty: CounterpartyResponse;
};

export function ArCustomerProductsView({ counterparty }: Props) {
  const customerId = counterparty.id;
  const groups = productGroupsFromCounterparty(counterparty);
  const base = `/accounts-receivable/customers/${customerId}`;
  const defaultOpen = useMemo(
    () => Object.fromEntries(groups.map((g) => [g.id, true])),
    [groups]
  );
  const [open, setOpen] = useState<Record<string, boolean>>(defaultOpen);
  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  if (groups.length === 0) {
    return (
      <div className="space-y-6">
        <FeatureEmptyState
          icon={Package}
          title="No products"
          description="This customer has no demo product catalog in the database yet."
          ctaHref={base}
          ctaLabel="Back to customer"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Products</h1>
        <Button size="sm" variant="outline" type="button" disabled>
          + Add product
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-background">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Service period</Label>
          <Select disabled defaultValue="">
            <SelectTrigger className="h-9 w-[200px] rounded-lg text-xs">
              <SelectValue placeholder="Make a selection" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="demo">FY 2025</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Group by</Label>
          <Select disabled defaultValue="doc">
            <SelectTrigger className="h-9 w-[160px] rounded-lg text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="doc">Document</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Sort by</Label>
          <Select disabled defaultValue="">
            <SelectTrigger className="h-9 w-[160px] rounded-lg text-xs">
              <SelectValue placeholder="Make a selection" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex shrink-0 gap-0.5">
          <Button type="button" variant="ghost" size="icon" className="size-9" disabled aria-label="Sort">
            <ArrowUpDown className="size-4 text-muted-foreground" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-9" disabled aria-label="Filter">
            <Filter className="size-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-4">
          {groups.map((g) => (
            <ProductGroupCard
              key={g.id}
              group={g}
              basePath={base}
              open={open[g.id] ?? true}
              onToggle={() =>
                setOpen((prev) => ({ ...prev, [g.id]: !(prev[g.id] ?? true) }))
              }
            />
          ))}
        </div>

        <aside className="hidden rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 text-xs dark:border-slate-800 dark:bg-slate-900/30 lg:block">
          <p className="font-semibold text-foreground">Billing</p>
          <ul className="mt-2 space-y-2 text-muted-foreground">
            <li className="font-medium text-foreground">Products</li>
            <li>
              <Link
                href="/accounts-receivable/invoices"
                className="hover:text-[color:var(--brand-primary)]"
              >
                Invoices
              </Link>
            </li>
          </ul>
          <p className="mt-4 font-semibold text-foreground">Obligations</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>Key terms</li>
            <li>Renewal</li>
          </ul>
          <p className="mt-4 font-semibold text-foreground">Profile</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>Business information</li>
            <li>Additional fields</li>
          </ul>
          <p className="mt-4 font-semibold text-foreground">Documents</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>Documents</li>
            <li>Notes</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

function ProductGroupCard({
  group,
  basePath,
  open,
  onToggle,
}: {
  group: ProductGroupDemo;
  basePath: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-left transition-colors duration-200 hover:bg-slate-100/80 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-900/60"
      >
        <span className="text-sm font-semibold">{group.title}</span>
        <span className="flex shrink-0 items-center gap-1">
          <MoreVertical className="size-4 text-muted-foreground" aria-hidden />
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open ? "rotate-0" : "-rotate-90"
            )}
          />
        </span>
      </button>
      {open ? (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {group.rows.map((row) => {
            const { amount: priceAmount, suffix: priceSuffix } = splitProductPriceLabel(
              row.priceLabel
            );
            const invoiceLine = formatProductInvoiceProgress(row);
            const invoiceComplete = isProductInvoiceProgressComplete(row);
            return (
              <Link
                key={row.id}
                href={`${basePath}/products/${row.id}`}
                className={cn(
                  LEDGER_TABLE_BODY_ROW,
                  "flex cursor-pointer flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                )}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className="mt-1 inline-flex size-4 shrink-0 items-center justify-center rounded-sm border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-950"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-semibold text-foreground">{row.name}</span>
                      <span className={productKindTagClass(row.kindTone)}>{row.kindLabel}</span>
                    </div>
                    {row.tieredPricing?.length ? (
                      <ul className="mt-2 space-y-1 border-l border-slate-200 pl-3 text-xs text-muted-foreground dark:border-slate-700">
                        {row.tieredPricing.map((t) => (
                          <li key={t.label} className="flex justify-between gap-6 tabular-nums">
                            <span>{t.label}</span>
                            <span className="font-mono text-foreground/90">{t.price}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-foreground">
                      {row.activePeriod ? (
                        <Circle
                          className="size-2.5 shrink-0 fill-emerald-500 text-emerald-500"
                          aria-hidden
                        />
                      ) : (
                        <Circle
                          className="size-2.5 shrink-0 fill-slate-400 text-slate-400"
                          aria-hidden
                        />
                      )}
                      {row.serviceRange}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-start gap-x-6 gap-y-1 sm:ml-auto sm:min-w-0 sm:flex-nowrap sm:justify-end">
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
                    <span className="font-semibold text-foreground">{priceAmount}</span>
                    {priceSuffix ? (
                      <span className="text-xs font-normal text-muted-foreground">
                        {priceSuffix}
                      </span>
                    ) : null}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
