"use client";

import { useMemo, useState } from "react";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Mail } from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ArInvoicePipeline, ArInvoiceRow } from "@/lib/mock-data/ar-mocks";
import {
  arAgingTotals,
  mockArInvoiceRows,
} from "@/lib/mock-data/ar-mocks";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function fmtEUR(n: number) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}

const PIPELINE_LABEL: Record<ArInvoicePipeline, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_paid: "Partially paid",
  paid: "Paid",
  overdue: "Overdue",
};

function pipelineBadge(p: ArInvoicePipeline) {
  const base =
    "border-0 font-medium capitalize shadow-none transition-all duration-200";
  switch (p) {
    case "draft":
      return <Badge className={cn(base, "bg-slate-100 text-slate-700")}>{PIPELINE_LABEL[p]}</Badge>;
    case "sent":
      return <Badge className={cn(base, "bg-sky-500/15 text-sky-900 dark:text-sky-200")}>{PIPELINE_LABEL[p]}</Badge>;
    case "partially_paid":
      return <Badge className={cn(base, "bg-amber-500/15 text-amber-900 dark:text-amber-100")}>{PIPELINE_LABEL[p]}</Badge>;
    case "paid":
      return <Badge className={cn(base, "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100")}>{PIPELINE_LABEL[p]}</Badge>;
    case "overdue":
      return <Badge className={cn(base, "bg-rose-500/15 text-rose-900 dark:text-rose-100")}>{PIPELINE_LABEL[p]}</Badge>;
    default:
      return null;
  }
}

export function ArInvoicesView() {
  const { toast } = useToast();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const aging = useMemo(() => arAgingTotals(mockArInvoiceRows), []);

  const columns: ColumnDef<ArInvoiceRow>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(v) =>
              table.toggleAllPageRowsSelected(v === true)
            }
            aria-label="Select all overdue"
            className="translate-y-0.5"
          />
        ),
        cell: ({ row }) =>
          row.getCanSelect() ? (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(v) => row.toggleSelected(v === true)}
              onClick={(e) => e.stopPropagation()}
              aria-label="Select row"
              className="translate-y-0.5"
            />
          ) : (
            <span className="inline-block w-4" />
          ),
        enableSorting: false,
      },
      {
        accessorKey: "pipeline",
        header: "Status",
        cell: ({ row }) => pipelineBadge(row.original.pipeline),
      },
      {
        accessorKey: "amount",
        header: () => <span className="text-right">Amount</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-sm font-semibold tabular-nums">
            {fmtEUR(row.original.amount)}
          </div>
        ),
      },
      {
        accessorKey: "vat",
        header: () => <span className="text-right">VAT</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-sm tabular-nums text-muted-foreground">
            {fmtEUR(row.original.vat)}
          </div>
        ),
      },
      {
        accessorKey: "customerName",
        header: "Customer",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.customerName}</span>
        ),
      },
      {
        accessorKey: "dueDate",
        header: "Due date",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {format(parseISO(row.original.dueDate), "d MMM yyyy")}
          </span>
        ),
      },
      {
        accessorKey: "daysOverdue",
        header: () => <span className="text-right">Days overdue</span>,
        cell: ({ row }) => (
          <div
            className={cn(
              "text-right font-mono text-sm tabular-nums",
              row.original.daysOverdue > 0
                ? "font-semibold text-rose-600 dark:text-rose-400"
                : "text-muted-foreground"
            )}
          >
            {row.original.daysOverdue > 0 ? row.original.daysOverdue : "—"}
          </div>
        ),
      },
      {
        accessorKey: "mydataStatus",
        header: "myDATA",
        cell: ({ row }) => {
          const s = row.original.mydataStatus;
          return (
            <Badge
              variant={
                s === "transmitted"
                  ? "gemiVerified"
                  : s === "error"
                    ? "destructive"
                    : "secondary"
              }
              className="capitalize"
            >
              {s}
            </Badge>
          );
        },
      },
      {
        accessorKey: "paymentMatching",
        header: "Matching",
        cell: ({ row }) => (
          <span className="text-xs capitalize text-muted-foreground">
            {row.original.paymentMatching.replace("_", " ")}
          </span>
        ),
      },
      {
        id: "remind",
        header: "",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 rounded-lg px-2 text-xs transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              toast({
                title: "Reminder queued",
                description: `${row.original.customerName} — demo only.`,
              });
            }}
          >
            <Mail className="size-3.5" aria-hidden />
            Remind
          </Button>
        ),
        enableSorting: false,
      },
    ],
    []
  );

  const selectedOverdueCount = useMemo(() => {
    const ids = Object.keys(rowSelection).filter((k) => rowSelection[k]);
    return mockArInvoiceRows.filter(
      (r) => ids.includes(r.id) && r.pipeline === "overdue"
    ).length;
  }, [rowSelection]);

  const bulkRemind = () => {
    toast({
      title: "Batch reminders sent",
      description: `${selectedOverdueCount} overdue invoice(s) — demo.`,
    });
    setRowSelection({});
  };

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Invoices
        </h1>
        <p className="mt-1 max-w-2xl text-sm tracking-tight text-muted-foreground">
          AR pipeline, myDATA transmission, and collections actions.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            { label: "Current", value: aging.current, tone: "slate" },
            { label: "1–30 days", value: aging.d1_30, tone: "amber" },
            { label: "31–60 days", value: aging.d31_60, tone: "orange" },
            { label: "60+ days", value: aging.d60plus, tone: "rose" },
          ] as const
        ).map((c) => (
          <div
            key={c.label}
            className={cn(
              "rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-background",
              c.tone === "amber" && "border-amber-200/50 bg-amber-50/30 dark:border-amber-900/30",
              c.tone === "orange" && "border-orange-200/50 bg-orange-50/25 dark:border-orange-900/25",
              c.tone === "rose" && "border-rose-200/50 bg-rose-50/25 dark:border-rose-900/25"
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {c.label}
            </p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
              {fmtEUR(c.value)}
            </p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={mockArInvoiceRows}
        getRowId={(r) => r.id}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        isRowSelectable={(r) => r.pipeline === "overdue"}
      />

      <AnimatePresence>
        {selectedOverdueCount > 0 ? (
          <motion.div
            key="bulk"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="pointer-events-none fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 justify-center px-4"
          >
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-slate-200/90 bg-white/95 px-5 py-3 shadow-lg backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95">
              <span className="text-sm font-medium text-muted-foreground">
                {selectedOverdueCount} overdue selected
              </span>
              <Button
                type="button"
                size="sm"
                className="rounded-full px-5 font-semibold"
                onClick={bulkRemind}
              >
                Send reminders to all overdue
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
