"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO, subDays } from "date-fns";
import { Filter, Search, Users } from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";
import { CounterpartyVatDialog } from "@/components/features/organization/counterparty-vat-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCounterpartiesQuery } from "@/lib/hooks/api/use-organization";
import type { CounterpartyResponse } from "@/lib/schemas/organization";
import {
  counterpartyToArCustomer,
  isCustomerType,
} from "@/lib/organization/counterparty-mappers";
import type { ArCountry, ArCustomer } from "@/lib/views/ar";
import { enrichArCustomerRow } from "@/lib/views/ar-counterparty-context";
import { cn } from "@/lib/utils";

function fmtEUR(n: number) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}

const PAYMENT_TERMS = ["all", "Net 14", "Net 30", "Net 45"] as const;

type ArCustomerTableRow = ArCustomer & {
  billingContact: string;
  documentsCount: number;
  createdAt: Date;
};

function billingEmailFromCounterparty(c: CounterpartyResponse): string {
  const ci = c.contact_info;
  if (ci && typeof ci === "object" && ci !== null) {
    const e = (ci as Record<string, unknown>).email;
    if (typeof e === "string" && e.trim()) return e.trim();
  }
  const slug =
    c.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 20) || "client";
  return `billing@${slug}.example`;
}

function documentsCountForCustomer(enriched: ArCustomer): number {
  if (enriched.invoices.length > 0) {
    return Math.min(5, enriched.invoices.length + 1);
  }
  const h = parseInt(enriched.id.replace(/-/g, "").slice(-6), 16);
  return (h % 4) + 1;
}

export function ArCustomersView() {
  const router = useRouter();
  const { data: counterparties, isLoading } = useCounterpartiesQuery();
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [country, setCountry] = useState<ArCountry | "all">("all");
  const [terms, setTerms] = useState<(typeof PAYMENT_TERMS)[number]>("all");
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const customers = useMemo((): ArCustomerTableRow[] => {
    return (counterparties ?? [])
      .filter((c) => isCustomerType(c.type))
      .map((cp) => {
        const base = counterpartyToArCustomer(cp);
        const enriched = enrichArCustomerRow(base, cp);
        return {
          ...enriched,
          billingContact: billingEmailFromCounterparty(cp),
          documentsCount: documentsCountForCustomer(enriched),
          createdAt: new Date(cp.created_at),
        };
      });
  }, [counterparties]);

  const q = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (overdueOnly && c.overdueAmount <= 0) return false;
      if (country !== "all" && c.country !== country) return false;
      if (terms !== "all" && c.paymentTerms !== terms) return false;
      if (q) {
        const blob = `${c.legalName} ${c.vatNumber} ${c.billingContact}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [customers, overdueOnly, country, terms, q]);

  const structuralFilterCount =
    (overdueOnly ? 1 : 0) +
    (country !== "all" ? 1 : 0) +
    (terms !== "all" ? 1 : 0);

  const newestCreated = useMemo(() => {
    if (customers.length === 0) return null;
    const first = customers[0];
    if (!first) return null;
    return customers.reduce(
      (max, c) => (c.createdAt > max ? c.createdAt : max),
      first.createdAt
    );
  }, [customers]);

  const newLast90 = useMemo(() => {
    const cutoff = subDays(new Date(), 90);
    return customers.filter((c) => c.createdAt >= cutoff).length;
  }, [customers]);

  const withUpcomingBills = useMemo(
    () => customers.filter((c) => c.totalOutstanding > 0).length,
    [customers]
  );

  const clearAllFilters = () => {
    setSearch("");
    setOverdueOnly(false);
    setCountry("all");
    setTerms("all");
    setFiltersOpen(false);
  };

  const columns: ColumnDef<ArCustomerTableRow>[] = useMemo(
    () => [
      {
        accessorKey: "legalName",
        header: () => (
          <span className="inline-flex items-center gap-1">
            Customer
            <span className="text-muted-foreground" aria-hidden>
              ↓
            </span>
          </span>
        ),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.legalName}
          </span>
        ),
      },
      {
        id: "billingContact",
        header: () => (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            Billing contact
            <span className="text-[10px] font-normal opacity-70" aria-hidden>
              ⇅
            </span>
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-foreground">{row.original.billingContact}</span>
        ),
      },
      {
        id: "documentsCount",
        header: () => <span>Documents</span>,
        cell: ({ row }) => (
          <span className="tabular-nums text-foreground">
            {row.original.documentsCount}
          </span>
        ),
      },
      {
        accessorKey: "vatNumber",
        header: "VAT number",
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {row.original.vatNumber}
          </span>
        ),
      },
      {
        accessorKey: "totalOutstanding",
        header: () => <span className="text-right tabular-nums">Outstanding</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-sm font-semibold tabular-nums">
            {fmtEUR(row.original.totalOutstanding)}
          </div>
        ),
      },
      {
        accessorKey: "overdueAmount",
        header: () => <span className="text-right tabular-nums">Overdue</span>,
        cell: ({ row }) => (
          <div
            className={cn(
              "text-right font-mono text-sm tabular-nums",
              row.original.overdueAmount > 0
                ? "font-semibold text-rose-600 dark:text-rose-400"
                : "text-muted-foreground"
            )}
          >
            {fmtEUR(row.original.overdueAmount)}
          </div>
        ),
      },
      {
        accessorKey: "dsoDays",
        header: () => <span className="text-right">DSO</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-sm tabular-nums">
            {row.original.dsoDays}d
          </div>
        ),
      },
      {
        accessorKey: "paymentTerms",
        header: "Payment terms",
      },
      {
        accessorKey: "lastPaymentDate",
        header: "Last payment",
        cell: ({ row }) =>
          row.original.lastPaymentDate ? (
            <span className="font-mono text-xs text-muted-foreground">
              {format(parseISO(row.original.lastPaymentDate), "d MMM yyyy")}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <>
        <FeatureEmptyState
          icon={Users}
          title="No customers yet"
          description="Add a customer with VAT lookup from the Business Registry, or manage counterparties from integrations later."
          action={{
            label: "New customer",
            onClick: () => setNewCustomerOpen(true),
          }}
          ctaHref="/integrations"
          ctaLabel="Integrations"
        />
        <CounterpartyVatDialog
          open={newCustomerOpen}
          onOpenChange={setNewCustomerOpen}
          counterpartyType="customer"
          title="New customer"
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/integrations"
          className="group rounded-xl border border-sky-200/90 bg-sky-50/90 p-4 shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50 dark:border-sky-900/50 dark:bg-sky-950/30 dark:hover:border-sky-800 dark:hover:bg-sky-950/40"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-900/70 dark:text-sky-200/80">
            Documents
          </p>
          <p className="mt-1.5 text-base font-semibold leading-snug text-foreground">
            Update the customer relationship
          </p>
          <p className="mt-3 text-sm font-medium text-sky-700 group-hover:underline dark:text-sky-300">
            View and upload files →
          </p>
        </Link>
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-background">
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {customers.length}{" "}
            <span className="text-base font-normal text-muted-foreground">
              customers
            </span>
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            PLG customers
          </p>
          <Link
            href="#customers-table"
            className="mt-2 inline-block text-sm font-medium text-sky-700 hover:underline dark:text-sky-400"
          >
            View
          </Link>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-background">
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {newLast90}{" "}
            <span className="text-base font-normal text-muted-foreground">
              new customers
            </span>
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Last 90 days
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {newestCreated
              ? `Last created ${format(newestCreated, "MMM d, yyyy")}`
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-background">
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {withUpcomingBills}{" "}
            <span className="text-base font-normal text-muted-foreground">
              customers with upcoming bills
            </span>
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Next 90 days
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">Next due Oct 19, 2025</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Customers
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-lg" disabled>
            Export
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-lg bg-[#c4a574] px-4 font-semibold text-slate-900 shadow-sm hover:bg-[#b89968]"
            onClick={() => setNewCustomerOpen(true)}
          >
            + Create customer
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative min-w-0 flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label="Search customers"
            className="h-9 rounded-lg border-slate-200/90 pl-9 text-sm dark:border-slate-800"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 gap-2 rounded-lg border px-3 text-sm font-medium",
                  structuralFilterCount > 0
                    ? "border-sky-300 bg-sky-50 text-sky-950 hover:bg-sky-100/90 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-50 dark:hover:bg-sky-950/70"
                    : "border-slate-200/90 bg-white dark:border-slate-800"
                )}
              >
                <Filter className="size-4 shrink-0 opacity-80" aria-hidden />
                Filters and views ({structuralFilterCount})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 space-y-4 p-4" align="start">
              <div className="flex items-center gap-2">
                <input
                  id="ar-cust-overdue-pop"
                  type="checkbox"
                  checked={overdueOnly}
                  onChange={(e) => setOverdueOnly(e.target.checked)}
                  className="size-4 rounded border-slate-300"
                />
                <Label htmlFor="ar-cust-overdue-pop" className="text-sm font-medium">
                  Overdue only
                </Label>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Country</Label>
                <Select
                  value={country}
                  onValueChange={(v) => setCountry(v as ArCountry | "all")}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="GR">Greece</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="NL">Netherlands</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="IE">Ireland</SelectItem>
                    <SelectItem value="SE">Sweden</SelectItem>
                    <SelectItem value="EE">Estonia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Payment terms</Label>
                <Select
                  value={terms}
                  onValueChange={(v) =>
                    setTerms(v as (typeof PAYMENT_TERMS)[number])
                  }
                >
                  <SelectTrigger className="h-9 w-full rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t === "all" ? "All terms" : t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>
          {(structuralFilterCount > 0 || q.length > 0) && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div id="customers-table">
        <DataTable
          columns={columns}
          data={filtered}
          getRowId={(r) => r.id}
          rowHover="ledger"
          onRowClick={(row) => {
            router.push(`/accounts-receivable/customers/${row.id}`);
          }}
        />
      </div>

      <CounterpartyVatDialog
        open={newCustomerOpen}
        onOpenChange={setNewCustomerOpen}
        counterpartyType="customer"
        title="New customer"
      />
    </div>
  );
}
