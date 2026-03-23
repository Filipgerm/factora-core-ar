"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { Users } from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";
import { CounterpartyVatDialog } from "@/components/features/organization/counterparty-vat-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCounterpartiesQuery } from "@/lib/hooks/api/use-organization";
import {
  counterpartyToArCustomer,
  isCustomerType,
} from "@/lib/organization/counterparty-mappers";
import type { ArCountry, ArCustomer } from "@/lib/views/ar";
import { cn } from "@/lib/utils";

function fmtEUR(n: number) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}

const PAYMENT_TERMS = ["all", "Net 14", "Net 30", "Net 45"] as const;

export function ArCustomersView() {
  const { data: counterparties, isLoading } = useCounterpartiesQuery();
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [country, setCountry] = useState<ArCountry | "all">("all");
  const [terms, setTerms] = useState<(typeof PAYMENT_TERMS)[number]>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [active, setActive] = useState<ArCustomer | null>(null);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);

  const customers = useMemo(
    () =>
      (counterparties ?? [])
        .filter((c) => isCustomerType(c.type))
        .map(counterpartyToArCustomer),
    [counterparties]
  );

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (overdueOnly && c.overdueAmount <= 0) return false;
      if (country !== "all" && c.country !== country) return false;
      if (terms !== "all" && c.paymentTerms !== terms) return false;
      return true;
    });
  }, [customers, overdueOnly, country, terms]);

  const columns: ColumnDef<ArCustomer>[] = useMemo(
    () => [
      {
        accessorKey: "legalName",
        header: "Legal name",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.legalName}
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

  const chartData = active
    ? [
        { bucket: "Current", amount: active.aging.current },
        { bucket: "1–30", amount: active.aging.d1_30 },
        { bucket: "31–60", amount: active.aging.d31_60 },
        { bucket: "60+", amount: active.aging.d60plus },
      ]
    : [];

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
          description="Add a customer with VAT lookup from GEMI, or manage counterparties from integrations later."
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
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        Data from{" "}
        <span className="font-medium text-foreground">counterparties</span> (customer
        / both). Balances and aging are placeholders until the AR API ships.
      </p>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-background">
        <div className="flex items-center gap-2">
          <input
            id="ar-cust-overdue"
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
            className="size-4 rounded border-slate-300"
          />
          <Label htmlFor="ar-cust-overdue" className="text-sm font-medium">
            Overdue only
          </Label>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Country</Label>
          <Select
            value={country}
            onValueChange={(v) => setCountry(v as ArCountry | "all")}
          >
            <SelectTrigger className="h-9 w-[140px] rounded-lg text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="GR">Greece</SelectItem>
              <SelectItem value="DE">Germany</SelectItem>
              <SelectItem value="NL">Netherlands</SelectItem>
              <SelectItem value="FR">France</SelectItem>
              <SelectItem value="IE">Ireland</SelectItem>
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
            <SelectTrigger className="h-9 w-[140px] rounded-lg text-xs">
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
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(r) => r.id}
        onRowClick={(row) => {
          setActive(row);
          setSheetOpen(true);
        }}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
          <SheetHeader className="border-b border-slate-100 pb-4 text-left dark:border-slate-800">
            <SheetTitle className="text-lg">{active?.legalName}</SheetTitle>
            <SheetDescription className="font-mono text-xs">
              {active?.vatNumber} · {active?.country}
            </SheetDescription>
          </SheetHeader>
          {active ? (
            <div className="flex flex-1 flex-col gap-6 p-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  AR aging
                </p>
                <div className="mt-2 h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${v / 1000}k`} />
                      <Bar
                        dataKey="amount"
                        fill="var(--brand-primary, #2f9a8a)"
                        radius={[4, 4, 0, 0]}
                        className="fill-[var(--brand-primary)]"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Open invoices
                </p>
                <ul className="mt-2 space-y-2">
                  {active.invoices.length === 0 ? (
                    <li className="text-sm text-muted-foreground">None open</li>
                  ) : (
                    active.invoices.map((inv) => (
                      <li
                        key={inv.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200/80 px-3 py-2 text-sm dark:border-slate-800"
                      >
                        <span className="font-mono text-xs">{inv.number}</span>
                        <span className="font-mono font-semibold tabular-nums">
                          {fmtEUR(inv.amount)}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Payment history
                </p>
                <ul className="mt-2 space-y-2">
                  {active.payments.length === 0 ? (
                    <li className="text-sm text-muted-foreground">No payments</li>
                  ) : (
                    active.payments.map((p) => (
                      <li
                        key={p.id}
                        className="rounded-lg border border-slate-200/80 px-3 py-2 text-sm dark:border-slate-800"
                      >
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            {format(parseISO(p.date), "d MMM yyyy")}
                          </span>
                          <Badge variant="secondary">{p.method}</Badge>
                        </div>
                        <p className="mt-1 font-mono font-semibold tabular-nums">
                          {p.amount}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
