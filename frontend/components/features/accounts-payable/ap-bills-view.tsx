"use client";

import { useMemo, useState } from "react";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Check, FileText } from "lucide-react";

import {
  SourceDocumentSheet,
  type SourceDocField,
} from "@/components/ledger/source-document-sheet";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ApBillPipeline, ApBillRow } from "@/lib/mock-data/ap-mocks";
import {
  apAgingBuckets,
  mockApBillRows,
  mockApVendors,
} from "@/lib/mock-data/ap-mocks";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function fmtEUR(n: number) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}

const PIPELINE_LABEL: Record<ApBillPipeline, string> = {
  draft: "Draft",
  approved: "Approved",
  scheduled: "Scheduled",
  paid: "Paid",
  overdue: "Overdue",
};

function pipelineBadge(p: ApBillPipeline) {
  const base = "border-0 font-medium capitalize";
  switch (p) {
    case "draft":
      return <Badge className={cn(base, "bg-slate-100 text-slate-800")}>{PIPELINE_LABEL[p]}</Badge>;
    case "approved":
      return <Badge className={cn(base, "bg-violet-500/15 text-violet-900 dark:text-violet-200")}>{PIPELINE_LABEL[p]}</Badge>;
    case "scheduled":
      return <Badge className={cn(base, "bg-sky-500/15 text-sky-900 dark:text-sky-200")}>{PIPELINE_LABEL[p]}</Badge>;
    case "paid":
      return <Badge className={cn(base, "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100")}>{PIPELINE_LABEL[p]}</Badge>;
    case "overdue":
      return <Badge className={cn(base, "bg-rose-500/15 text-rose-900 dark:text-rose-100")}>{PIPELINE_LABEL[p]}</Badge>;
    default:
      return null;
  }
}

function billFields(row: ApBillRow): SourceDocField[] {
  return [
    { key: "v", label: "Vendor", value: row.vendorName },
    { key: "a", label: "Amount (EUR)", value: String(row.amount) },
    { key: "d", label: "Due date", value: row.dueDate },
    { key: "m", label: "myDATA", value: row.mydataStatus },
    { key: "p", label: "Pipeline", value: row.pipeline },
  ];
}

function isTrustedVendor(vendorId: string) {
  return mockApVendors.find((v) => v.id === vendorId)?.trustedRecurring ?? false;
}

export function ApBillsView() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ApBillRow[]>(() => [...mockApBillRows]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [docOpen, setDocOpen] = useState(false);
  const [docRow, setDocRow] = useState<ApBillRow | null>(null);

  const aging = useMemo(() => apAgingBuckets(rows), [rows]);

  const approveOne = (id: string) => {
    setRows((r) =>
      r.map((b) =>
        b.id === id && b.pipeline !== "paid"
          ? { ...b, pipeline: "approved" as ApBillPipeline }
          : b
      )
    );
    toast({ title: "Bill approved", description: "Demo workflow only." });
  };

  const bulkApprove = () => {
    const ids = Object.keys(rowSelection).filter((k) => rowSelection[k]);
    setRows((r) =>
      r.map((b) =>
        ids.includes(b.id) && b.pipeline !== "paid"
          ? { ...b, pipeline: "approved" as ApBillPipeline }
          : b
      )
    );
    toast({
      title: "Bulk approval",
      description: `${ids.length} bill(s) from trusted vendors.`,
    });
    setRowSelection({});
  };

  const selectedTrusted = useMemo(() => {
    const ids = Object.keys(rowSelection).filter((k) => rowSelection[k]);
    return rows.filter(
      (b) => ids.includes(b.id) && isTrustedVendor(b.vendorId)
    ).length;
  }, [rowSelection, rows]);

  const columns: ColumnDef<ApBillRow>[] = useMemo(
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
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(v === true)}
            aria-label="Select trusted rows"
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
        header: "Pipeline",
        cell: ({ row }) => pipelineBadge(row.original.pipeline),
      },
      {
        accessorKey: "vendorName",
        header: "Vendor",
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{row.original.vendorName}</span>
            {isTrustedVendor(row.original.vendorId) ? (
              <Badge variant="outline" className="w-fit text-[10px]">
                Trusted recurring
              </Badge>
            ) : null}
          </div>
        ),
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
        accessorKey: "dueDate",
        header: "Due date",
        cell: ({ row }) => {
          const d = parseISO(row.original.dueDate);
          const urgent =
            row.original.pipeline === "overdue" ||
            (row.original.pipeline !== "paid" && d < new Date());
          return (
            <div
              className={cn(
                "rounded-lg border px-2.5 py-1.5 font-mono text-xs tabular-nums",
                urgent
                  ? "border-rose-200/80 bg-rose-50/80 font-semibold text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100"
                  : "border-slate-200/80 bg-slate-50/50 text-muted-foreground dark:border-slate-800"
              )}
            >
              {format(d, "d MMM yyyy")}
            </div>
          );
        },
      },
      {
        accessorKey: "mydataStatus",
        header: "myDATA",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.mydataStatus === "transmitted"
                ? "gemiVerified"
                : row.original.mydataStatus === "error"
                  ? "destructive"
                  : "secondary"
            }
            className="capitalize"
          >
            {row.original.mydataStatus}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 rounded-lg px-2 text-xs"
              disabled={
                row.original.pipeline === "paid" ||
                row.original.pipeline === "approved"
              }
              onClick={(e) => {
                e.stopPropagation();
                approveOne(row.original.id);
              }}
            >
              <Check className="size-3.5" aria-hidden />
              Approve
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={(e) => {
                e.stopPropagation();
                setDocRow(row.original);
                setDocOpen(true);
              }}
            >
              <FileText className="size-4 opacity-70" aria-hidden />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Bills
        </h1>
        <p className="mt-1 max-w-2xl text-sm tracking-tight text-muted-foreground">
          AP pipeline, due dates, and myDATA — quick approve trusted vendors in
          bulk.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(
          [
            { label: "Due this week", value: aging.dueThisWeek },
            { label: "Due next week", value: aging.dueNextWeek },
            { label: "Overdue", value: aging.overdue },
          ] as const
        ).map((c) => (
          <div
            key={c.label}
            className={cn(
              "rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-background",
              c.label === "Overdue" &&
                "border-rose-200/60 bg-rose-50/30 dark:border-rose-900/40"
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
        data={rows}
        getRowId={(r) => r.id}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        isRowSelectable={(r) => isTrustedVendor(r.vendorId)}
      />

      <AnimatePresence>
        {selectedTrusted > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
          >
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-slate-200/90 bg-white/95 px-5 py-3 shadow-lg backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95">
              <span className="text-sm text-muted-foreground">
                {selectedTrusted} trusted vendor bill(s)
              </span>
              <Button
                type="button"
                size="sm"
                className="rounded-full font-semibold"
                onClick={bulkApprove}
              >
                Approve selected
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {docRow ? (
        <SourceDocumentSheet
          open={docOpen}
          onOpenChange={(o) => {
            setDocOpen(o);
            if (!o) setDocRow(null);
          }}
          title={`Bill ${docRow.id}`}
          subtitle={docRow.vendorName}
          fields={billFields(docRow)}
        />
      ) : null}
    </div>
  );
}
