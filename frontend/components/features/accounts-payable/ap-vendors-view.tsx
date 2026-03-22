"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";

import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ApVendor } from "@/lib/mock-data/ap-mocks";
import { mockApVendors } from "@/lib/mock-data/ap-mocks";
import { cn } from "@/lib/utils";

function fmtEUR(n: number) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}

export function ApVendorsView() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ApVendor | null>(null);

  const columns: ColumnDef<ApVendor>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "vatNumber",
        header: "VAT",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.vatNumber}
          </span>
        ),
      },
      {
        accessorKey: "country",
        header: "Country",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.country}</Badge>
        ),
      },
      {
        accessorKey: "totalApBalance",
        header: () => <span className="text-right">AP balance</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-sm font-semibold tabular-nums">
            {fmtEUR(row.original.totalApBalance)}
          </div>
        ),
      },
      {
        accessorKey: "overduePayments",
        header: () => <span className="text-right">Overdue</span>,
        cell: ({ row }) => (
          <div
            className={cn(
              "text-right font-mono text-sm tabular-nums",
              row.original.overduePayments > 0
                ? "font-semibold text-rose-600 dark:text-rose-400"
                : "text-muted-foreground"
            )}
          >
            {fmtEUR(row.original.overduePayments)}
          </div>
        ),
      },
      {
        accessorKey: "defaultExpenseCategory",
        header: "Default category",
        cell: ({ row }) => (
          <span className="max-w-[200px] truncate text-xs text-muted-foreground">
            {row.original.defaultExpenseCategory}
          </span>
        ),
      },
      {
        accessorKey: "bankDetails",
        header: "Bank",
        cell: ({ row }) => (
          <span className="max-w-[160px] truncate font-mono text-[11px] text-muted-foreground">
            {row.original.bankDetails}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-5">
      <DataTable
        columns={columns}
        data={mockApVendors}
        getRowId={(r) => r.id}
        onRowClick={(row) => {
          setActive(row);
          setOpen(true);
        }}
      />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
          <SheetHeader className="border-b border-slate-100 pb-4 text-left dark:border-slate-800">
            <SheetTitle>{active?.name}</SheetTitle>
            <SheetDescription className="font-mono text-xs">
              {active?.vatNumber} · Avg {active?.avgDaysToPay} days to pay
            </SheetDescription>
          </SheetHeader>
          {active ? (
            <div className="flex flex-1 flex-col gap-6 p-4">
              <div className="rounded-xl border border-teal-200/40 bg-[var(--brand-primary-subtle)] px-4 py-3 dark:border-teal-800/40">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Average days to pay
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                  {active.avgDaysToPay}{" "}
                  <span className="text-base font-normal text-muted-foreground">
                    days
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Bills
                </p>
                <ul className="mt-2 space-y-2">
                  {active.bills.length === 0 ? (
                    <li className="text-sm text-muted-foreground">No open bills</li>
                  ) : (
                    active.bills.map((b) => (
                      <li
                        key={b.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200/80 px-3 py-2 text-sm dark:border-slate-800"
                      >
                        <span className="font-mono text-xs">{b.number}</span>
                        <span className="font-mono font-semibold tabular-nums">
                          {fmtEUR(b.amount)}
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
                    <li className="text-sm text-muted-foreground">None</li>
                  ) : (
                    active.payments.map((p) => (
                      <li
                        key={p.id}
                        className="rounded-lg border border-slate-200/80 px-3 py-2 text-sm dark:border-slate-800"
                      >
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{format(parseISO(p.date), "d MMM yyyy")}</span>
                          <Badge variant="secondary">{p.method}</Badge>
                        </div>
                        <p className="mt-1 font-mono font-semibold">{p.amount}</p>
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
