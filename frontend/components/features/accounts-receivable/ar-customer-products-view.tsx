"use client";

import Link from "next/link";
import { ChevronDown, Circle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArCustomerCrumbBar } from "@/components/features/accounts-receivable/ar-customer-nav";
import {
  getCustomerProductGroups,
  type ProductGroupDemo,
} from "@/lib/views/ar-customer-demo-data";
import { cn } from "@/lib/utils";

type Props = {
  customerId: string;
  legalName: string;
};

export function ArCustomerProductsView({ customerId, legalName }: Props) {
  const groups = getCustomerProductGroups(customerId);
  const base = `/accounts-receivable/customers/${customerId}`;
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.id, true]))
  );

  return (
    <div className="space-y-6">
      <ArCustomerCrumbBar
        segments={[
          { label: "Customer", href: "/accounts-receivable/customers" },
          { label: legalName, href: base },
          { label: "Products" },
        ]}
      />

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
        className="flex w-full items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 text-left transition-colors duration-200 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-900/50"
      >
        <span className="text-sm font-semibold">{group.title}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>
      {open ? (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {group.rows.map((row) => (
            <Link
              key={row.id}
              href={`${basePath}/products/${row.id}`}
              className="flex flex-col gap-3 px-4 py-4 transition-colors duration-200 hover:bg-[var(--brand-primary-subtle)]/50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className="mt-1 inline-block size-3.5 shrink-0 rounded-full border border-slate-300 dark:border-slate-600"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{row.name}</p>
                  <p className="text-xs text-[color:var(--brand-primary)]">
                    {row.kindLabel}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Circle
                      className={cn(
                        "size-2.5 shrink-0 fill-current",
                        row.activePeriod
                          ? "text-emerald-500"
                          : "text-slate-400"
                      )}
                      aria-hidden
                    />
                    {row.serviceRange}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                <span
                  className={cn(
                    "text-xs font-medium",
                    row.invoicingTone === "complete"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-foreground"
                  )}
                >
                  {row.invoicingLabel}
                </span>
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {row.priceLabel}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
