"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ApReimbursementRow, ApReimbursementStatus } from "@/lib/mock-data/ap-mocks";
import {
  mockApReimbursementSummaries,
  mockApReimbursements,
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

function statusBadge(s: ApReimbursementStatus) {
  switch (s) {
    case "submitted":
      return <Badge variant="secondary">Submitted</Badge>;
    case "approved":
      return (
        <Badge className="bg-violet-500/15 text-violet-900 dark:text-violet-200">
          Approved
        </Badge>
      );
    case "paid":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-900 dark:text-emerald-100">
          Paid
        </Badge>
      );
    default:
      return null;
  }
}

export function ApReimbursementsView() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ApReimbursementRow[]>(() => [
    ...mockApReimbursements,
  ]);
  const [approvalMode, setApprovalMode] = useState(false);

  const columns: ColumnDef<ApReimbursementRow>[] = useMemo(
    () => [
      {
        accessorKey: "employeeName",
        header: "Employee",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.employeeName}</span>
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
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => statusBadge(row.original.status),
      },
      {
        accessorKey: "aiSuggestedCategory",
        header: "AI category",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.aiSuggestedCategory}
          </span>
        ),
      },
      ...(approvalMode
        ? [
            {
              id: "approve",
              header: "",
              cell: ({ row }: { row: { original: ApReimbursementRow } }) =>
                row.original.status === "submitted" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRows((r) =>
                        r.map((x) =>
                          x.id === row.original.id
                            ? { ...x, status: "approved" as ApReimbursementStatus }
                            : x
                        )
                      );
                      toast({
                        title: "Claim approved",
                        description: row.original.employeeName,
                      });
                    }}
                  >
                    Approve
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                ),
            } as ColumnDef<ApReimbursementRow>,
          ]
        : []),
    ],
    [approvalMode, toast]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-background">
          <Switch
            id="ap-rb-approval"
            checked={approvalMode}
            onCheckedChange={setApprovalMode}
          />
          <Label htmlFor="ap-rb-approval" className="text-sm font-medium">
            Approval workflow
          </Label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {mockApReimbursementSummaries.map((s) => (
          <div
            key={s.employeeId}
            className={cn(
              "rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-background"
            )}
          >
            <p className="text-sm font-semibold tracking-tight">
              {s.employeeName}
            </p>
            <p className="text-xs text-muted-foreground">{s.monthLabel}</p>
            <div className="mt-3 flex gap-6">
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Submitted
                </p>
                <p className="font-mono text-lg font-semibold tabular-nums">
                  {fmtEUR(s.totalSubmitted)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Approved
                </p>
                <p className="font-mono text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {fmtEUR(s.totalApproved)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <DataTable columns={columns} data={rows} getRowId={(r) => r.id} />
    </div>
  );
}
