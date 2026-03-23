"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { Check, FileText, Hourglass, Plus } from "lucide-react";

import { ArCreateInvoiceSheet } from "@/components/features/accounts-receivable/ar-create-invoice-sheet";
import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  aadeDocumentsToArInvoiceRows,
  arInvoiceKpisFromRows,
  manualInvoicesToArInvoiceRows,
} from "@/lib/dashboard/map-aade-invoices";
import { useDashboardAadeDocumentsQuery } from "@/lib/hooks/api/use-dashboard";
import { useManualInvoicesQuery } from "@/lib/hooks/api/use-invoices";
import type { ArInvoicePipeline, ArInvoiceRow } from "@/lib/views/ar";
import { cn } from "@/lib/utils";

function fmtEUR(n: number) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

const PIPELINE_LABEL: Record<ArInvoicePipeline, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_paid: "Partially paid",
  paid: "Paid",
  overdue: "Overdue",
};

function statusCell(pipeline: ArInvoicePipeline) {
  if (pipeline === "draft") {
    return (
      <span className="text-sm font-medium text-muted-foreground">
        {PIPELINE_LABEL.draft}
      </span>
    );
  }
  const base =
    "border-0 px-2.5 py-0.5 text-xs font-semibold shadow-none transition-all duration-200";
  switch (pipeline) {
    case "overdue":
      return (
        <Badge
          className={cn(
            base,
            "bg-rose-500/15 text-rose-900 dark:text-rose-100"
          )}
        >
          {PIPELINE_LABEL.overdue}
        </Badge>
      );
    case "sent":
      return (
        <Badge
          className={cn(
            base,
            "bg-sky-500/15 text-sky-900 dark:text-sky-200"
          )}
        >
          {PIPELINE_LABEL.sent}
        </Badge>
      );
    case "paid":
      return (
        <Badge
          className={cn(
            base,
            "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100"
          )}
        >
          {PIPELINE_LABEL.paid}
        </Badge>
      );
    case "partially_paid":
      return (
        <Badge
          className={cn(
            base,
            "bg-amber-500/15 text-amber-900 dark:text-amber-100"
          )}
        >
          {PIPELINE_LABEL.partially_paid}
        </Badge>
      );
    default:
      return null;
  }
}

function dueCell(row: ArInvoiceRow) {
  const dateStr = row.dueDate ?? row.issueDate ?? null;
  if (!dateStr) {
    return <span className="text-muted-foreground">—</span>;
  }
  const d = parseISO(dateStr);
  const daysPast = differenceInCalendarDays(new Date(), d);
  if (row.pipeline === "paid") {
    return (
      <span className="text-sm text-foreground">
        {format(d, "d MMM yyyy")}
      </span>
    );
  }
  // Past-due styling for any non-paid row (paid already returned above).
  const showOverdue = row.pipeline === "overdue" || daysPast > 0;

  if (showOverdue && daysPast > 0) {
    return (
      <span className="text-sm font-medium text-rose-600 dark:text-rose-400">
        {daysPast} days ago
      </span>
    );
  }
  return (
    <span className="text-sm text-foreground">{format(d, "d MMM yyyy")}</span>
  );
}

function mydataCell(row: ArInvoiceRow) {
  if (row.mydataStatus === "transmitted" && row.mydataMark) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
        <Check className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
        MARK: {row.mydataMark}
      </span>
    );
  }
  if (row.mydataStatus === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
        <Hourglass className="size-4 shrink-0" aria-hidden />
        Pending
      </span>
    );
  }
  return (
    <span className="text-sm font-medium text-rose-600 dark:text-rose-400">
      Error
    </span>
  );
}

export function ArInvoicesView() {
  const [createOpen, setCreateOpen] = useState(false);
  const aade = useDashboardAadeDocumentsQuery({ limit: 200, offset: 0 });
  const manual = useManualInvoicesQuery();

  const rows = useMemo(() => {
    const manualRows = manualInvoicesToArInvoiceRows(manual.data ?? []);
    const aadeRows = aade.data ? aadeDocumentsToArInvoiceRows(aade.data) : [];
    return [...manualRows, ...aadeRows].sort((x, y) => {
      const dx = x.issueDate ? parseISO(x.issueDate).getTime() : 0;
      const dy = y.issueDate ? parseISO(y.issueDate).getTime() : 0;
      return dy - dx;
    });
  }, [aade.data, manual.data]);
  const kpis = useMemo(() => arInvoiceKpisFromRows(rows), [rows]);

  const columns: ColumnDef<ArInvoiceRow>[] = useMemo(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: () => (
          <span className="inline-flex min-h-10 items-center">Number</span>
        ),
        cell: ({ row }) => (
          <span className="inline-flex min-h-10 items-center font-semibold text-foreground">
            {row.original.invoiceNumber}
          </span>
        ),
      },
      {
        accessorKey: "customerName",
        header: () => (
          <span className="inline-flex min-h-10 items-center">Customer</span>
        ),
        cell: ({ row }) => (
          <div className="flex min-h-10 flex-col justify-center gap-0.5 py-0.5">
            <p className="font-medium leading-tight text-foreground">
              {row.original.customerName}
            </p>
            <p className="text-xs leading-tight text-muted-foreground">
              {row.original.customerTaxLabel}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "amount",
        header: () => (
          <span className="flex min-h-10 w-full items-center justify-end">
            Amount
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex min-h-10 items-center justify-end text-sm font-semibold tabular-nums text-foreground">
            {fmtEUR(row.original.amount)}
          </div>
        ),
      },
      {
        id: "due",
        header: () => (
          <span className="inline-flex min-h-10 items-center">Due date</span>
        ),
        cell: ({ row }) => (
          <div className="flex min-h-10 items-center">{dueCell(row.original)}</div>
        ),
      },
      {
        id: "mydata",
        header: () => (
          <span className="inline-flex min-h-10 items-center">myDATA</span>
        ),
        cell: ({ row }) => (
          <div className="flex min-h-10 items-center">
            {mydataCell(row.original)}
          </div>
        ),
      },
      {
        accessorKey: "pipeline",
        header: () => (
          <span className="inline-flex min-h-10 items-center">Status</span>
        ),
        cell: ({ row }) => (
          <div className="flex min-h-10 items-center">
            {statusCell(row.original.pipeline)}
          </div>
        ),
      },
    ],
    []
  );

  if (aade.isLoading || manual.isLoading) {
    return (
      <div className="space-y-6 pb-24">
        <div className="flex justify-end">
          <Skeleton className="h-11 w-44 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[420px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <p className="text-xs leading-relaxed text-muted-foreground">
        List source:{" "}
        <span className="font-medium text-foreground">AADE myDATA documents</span>{" "}
        from your organization. Native AR invoices will replace this view when the
        invoice API ships.
      </p>
      <div className="flex justify-end">
        <Button
          type="button"
          size="lg"
          className="h-11 gap-2 rounded-xl bg-[var(--brand-primary)] px-6 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-[var(--brand-primary)]/90 hover:shadow-lg"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-5" aria-hidden />
          Create invoice
        </Button>
      </div>

      <ArCreateInvoiceSheet open={createOpen} onOpenChange={setCreateOpen} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-background">
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {fmtEUR(kpis.totalOutstanding.amount)}
            </p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              Total outstanding
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/80">
              {kpis.totalOutstanding.count} invoices
            </p>
          </div>
          <div className="rounded-xl border border-amber-200/50 bg-amber-50/30 px-4 py-4 shadow-sm dark:border-amber-900/30 dark:bg-amber-950/20">
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-amber-950 dark:text-amber-100">
              {fmtEUR(kpis.dueWithin30Days.amount)}
            </p>
            <p className="mt-1 text-xs font-medium text-amber-900/90 dark:text-amber-200/90">
              Due within 30 days
            </p>
            <p className="mt-0.5 text-[11px] text-amber-800/70 dark:text-amber-200/60">
              {kpis.dueWithin30Days.count} invoices
            </p>
          </div>
          <div className="rounded-xl border border-rose-200/60 bg-rose-50/30 px-4 py-4 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20">
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-rose-950 dark:text-rose-100">
              {fmtEUR(kpis.overdue.amount)}
            </p>
            <p className="mt-1 text-xs font-medium text-rose-900/90 dark:text-rose-200/90">
              Overdue
            </p>
            <p className="mt-0.5 text-[11px] text-rose-800/70 dark:text-rose-200/60">
              {kpis.overdue.count} invoices
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200/50 bg-emerald-50/30 px-4 py-4 shadow-sm dark:border-emerald-900/30 dark:bg-emerald-950/20">
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-emerald-950 dark:text-emerald-100">
              {fmtEUR(kpis.paidThisMonth.amount)}
            </p>
            <p className="mt-1 text-xs font-medium text-emerald-900/90 dark:text-emerald-200/90">
              Transmitted (this month)
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-800/70 dark:text-emerald-200/60">
              {kpis.paidThisMonth.count} invoices
            </p>
          </div>
      </div>

      {rows.length === 0 ? (
        <FeatureEmptyState
          icon={FileText}
          title="No invoices yet"
          description="Sync myDATA to pull AADE documents, or create a manual invoice to record revenue before native issuance ships."
          action={{
            label: "Create invoice",
            onClick: () => setCreateOpen(true),
          }}
          ctaHref="/integrations"
          ctaLabel="Check integrations"
        />
      ) : (
        <DataTable columns={columns} data={rows} getRowId={(r) => r.id} />
      )}
    </div>
  );
}
