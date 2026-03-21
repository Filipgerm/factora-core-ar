"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ArCreditMemo, ArCreditMemoStatus } from "@/lib/mock-data/ar-mocks";
import {
  mockArCreditMemos,
  mockArInvoiceRefsForMemo,
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

function statusBadge(s: ArCreditMemoStatus) {
  switch (s) {
    case "draft":
      return <Badge variant="secondary">Draft</Badge>;
    case "issued":
      return <Badge className="bg-sky-500/15 text-sky-900 dark:text-sky-200">Issued</Badge>;
    case "applied":
      return <Badge className="bg-emerald-500/15 text-emerald-900 dark:text-emerald-100">Applied</Badge>;
    default:
      return null;
  }
}

export function ArCreditMemosView() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ArCreditMemo[]>(() => [...mockArCreditMemos]);
  const [createOpen, setCreateOpen] = useState(false);
  const [invoicePick, setInvoicePick] = useState(mockArInvoiceRefsForMemo[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");

  const columns: ColumnDef<ArCreditMemo>[] = useMemo(
    () => [
      {
        accessorKey: "originalInvoiceRef",
        header: "Original invoice",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-medium">
            {row.original.originalInvoiceRef}
          </span>
        ),
      },
      {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ row }) => (
          <span className="max-w-[220px] truncate text-sm">
            {row.original.reason}
          </span>
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
        id: "arLink",
        header: "AR impact",
        cell: ({ row }) =>
          row.original.status === "applied" && row.original.reducesOutstanding ? (
            <span
              className={cn(
                "text-xs font-medium text-emerald-700 dark:text-emerald-400"
              )}
            >
              Reduces outstanding on linked invoice
            </span>
          ) : row.original.status === "applied" ? (
            <span className="text-xs text-muted-foreground">Applied</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
    ],
    []
  );

  const createFromInvoice = () => {
    const inv = mockArInvoiceRefsForMemo.find((x) => x.id === invoicePick);
    const amt = parseFloat(amount.replace(",", "."));
    if (!inv || !reason.trim() || Number.isNaN(amt)) {
      toast({ title: "Pick invoice, reason, and amount", variant: "destructive" });
      return;
    }
    setRows((r) => [
      {
        id: `cm-${Date.now()}`,
        originalInvoiceRef: inv.ref,
        linkedInvoiceId: inv.id,
        reason: reason.trim(),
        amount: amt,
        status: "draft",
        reducesOutstanding: false,
      },
      ...r,
    ]);
    toast({ title: "Credit memo draft created" });
    setReason("");
    setAmount("");
    setCreateOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Credit memos
          </h1>
          <p className="mt-1 max-w-2xl text-sm tracking-tight text-muted-foreground">
            Adjustments linked to AR invoices — applied memos reduce open
            balances.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" className="rounded-lg">
              Create from invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New credit memo</DialogTitle>
              <DialogDescription>
                Prefilled from invoice selection — demo state only.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-1.5">
                <Label>Invoice</Label>
                <Select value={invoicePick} onValueChange={setInvoicePick}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockArInvoiceRefsForMemo.map((x) => (
                      <SelectItem key={x.id} value={x.id}>
                        {x.ref} · {x.customer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cm-reason">Reason</Label>
                <Input
                  id="cm-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cm-amt">Amount (EUR)</Label>
                <Input
                  id="cm-amt"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="rounded-lg font-mono"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={createFromInvoice}>
                Create draft
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable columns={columns} data={rows} getRowId={(r) => r.id} />
    </div>
  );
}
