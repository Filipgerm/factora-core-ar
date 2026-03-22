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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ArContract, ArContractStatus } from "@/lib/mock-data/ar-mocks";
import {
  contractRenewalAlert,
  mockArContracts,
} from "@/lib/mock-data/ar-mocks";
import { cn } from "@/lib/utils";

function fmtEUR(n: number) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function statusBadge(status: ArContractStatus) {
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-200">Active</Badge>;
    case "expired":
      return <Badge variant="secondary">Expired</Badge>;
    case "cancelled":
      return <Badge variant="outline">Cancelled</Badge>;
    default:
      return null;
  }
}

export function ArContractsView() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [active, setActive] = useState<ArContract | null>(null);

  const columns: ColumnDef<ArContract>[] = useMemo(
    () => [
      {
        accessorKey: "customerName",
        header: "Customer",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <span className="font-medium">{row.original.customerName}</span>
            {(() => {
              const alert = contractRenewalAlert(
                row.original.nextRenewalDate,
                row.original.status
              );
              if (alert === "30")
                return (
                  <Badge className="w-fit border-amber-300/60 bg-amber-500/15 text-amber-900 dark:text-amber-100">
                    Renews ≤ 30d
                  </Badge>
                );
              if (alert === "60")
                return (
                  <Badge className="w-fit border-slate-300/60 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                    Renews ≤ 60d
                  </Badge>
                );
              return null;
            })()}
          </div>
        ),
      },
      {
        accessorKey: "startDate",
        header: "Start",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {format(parseISO(row.original.startDate), "d MMM yyyy")}
          </span>
        ),
      },
      {
        accessorKey: "endDate",
        header: "End",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {format(parseISO(row.original.endDate), "d MMM yyyy")}
          </span>
        ),
      },
      {
        accessorKey: "tcv",
        header: () => <span className="text-right">TCV</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-sm font-semibold tabular-nums">
            {fmtEUR(row.original.tcv)}
          </div>
        ),
      },
      {
        accessorKey: "recognizedToDate",
        header: () => <span className="text-right">Recognized</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-sm tabular-nums">
            {fmtEUR(row.original.recognizedToDate)}
          </div>
        ),
      },
      {
        accessorKey: "deferredRemaining",
        header: () => <span className="text-right">Deferred</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-sm tabular-nums text-muted-foreground">
            {fmtEUR(row.original.deferredRemaining)}
          </div>
        ),
      },
      {
        accessorKey: "nextRenewalDate",
        header: "Next renewal",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {format(parseISO(row.original.nextRenewalDate), "d MMM yyyy")}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => statusBadge(row.original.status),
      },
    ],
    []
  );

  return (
    <div className="space-y-5">
      <DataTable
        columns={columns}
        data={mockArContracts}
        getRowId={(r) => r.id}
        onRowClick={(row) => {
          setActive(row);
          setSheetOpen(true);
        }}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
          <SheetHeader className="border-b border-slate-100 pb-4 text-left dark:border-slate-800">
            <SheetTitle>Recognition schedule</SheetTitle>
            <SheetDescription>{active?.customerName}</SheetDescription>
          </SheetHeader>
          {active ? (
            <div className="p-4">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs uppercase">Period</TableHead>
                    <TableHead className="text-right text-xs uppercase">
                      Amount
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.recognitionSchedule.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground">
                        No future schedule
                      </TableCell>
                    </TableRow>
                  ) : (
                    active.recognitionSchedule.map((row) => (
                      <TableRow key={row.period}>
                        <TableCell className="font-mono text-xs">
                          {row.period}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-mono text-sm font-medium tabular-nums"
                          )}
                        >
                          {fmtEUR(row.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
