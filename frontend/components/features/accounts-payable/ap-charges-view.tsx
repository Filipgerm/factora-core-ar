"use client";

import { useMemo, useState } from "react";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
import { Upload } from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApChargeRow, ApChargeStatus } from "@/lib/mock-data/ap-mocks";
import {
  AP_CATEGORY_OPTIONS,
  mockApCharges,
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

function statusBadge(s: ApChargeStatus) {
  switch (s) {
    case "categorized":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-900 dark:text-emerald-200">
          Categorized
        </Badge>
      );
    case "needs_review":
      return <Badge variant="secondary">Needs review</Badge>;
    case "needs_receipt":
      return (
        <Badge className="bg-amber-500/15 text-amber-950 dark:text-amber-100">
          Needs receipt
        </Badge>
      );
    default:
      return null;
  }
}

const CARDS = ["all", "Corp · 4829", "Travel · 9912"] as const;
const TEAMS = ["all", "Engineering", "Sales", "Ops"] as const;

export function ApChargesView() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ApChargeRow[]>(() => [...mockApCharges]);
  const [cardFilter, setCardFilter] = useState<(typeof CARDS)[number]>("all");
  const [teamFilter, setTeamFilter] = useState<(typeof TEAMS)[number]>("all");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkCat, setBulkCat] = useState<string>(AP_CATEGORY_OPTIONS[0]);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (cardFilter !== "all" && r.cardLabel !== cardFilter) return false;
      if (teamFilter !== "all" && r.teamMember !== teamFilter) return false;
      if (catFilter !== "all" && r.aiSuggestedCategory !== catFilter)
        return false;
      return true;
    });
  }, [rows, cardFilter, teamFilter, catFilter]);

  const applyBulkCategory = () => {
    const ids = Object.keys(rowSelection).filter((k) => rowSelection[k]);
    if (ids.length === 0) return;
    setRows((r) =>
      r.map((row) =>
        ids.includes(row.id)
          ? { ...row, aiSuggestedCategory: bulkCat, status: "categorized" }
          : row
      )
    );
    toast({
      title: "Categories updated",
      description: `${ids.length} charge(s) → ${bulkCat}`,
    });
    setRowSelection({});
  };

  const onDropReceipt = (id: string) => {
    setRows((r) =>
      r.map((row) =>
        row.id === id
          ? { ...row, status: "categorized" as ApChargeStatus }
          : row
      )
    );
    toast({ title: "Receipt attached (demo)", description: id });
    setDragOverId(null);
  };

  const columns: ColumnDef<ApChargeRow>[] = useMemo(
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
            aria-label="Select all"
            className="translate-y-0.5"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(v === true)}
            onClick={(e) => e.stopPropagation()}
            className="translate-y-0.5"
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "merchant",
        header: "Merchant",
        cell: ({ row }) => {
          const needs = row.original.status === "needs_receipt";
          return (
            <div
              className={cn(
                "min-w-[140px] rounded-lg border-2 border-dashed px-2 py-2 transition-colors duration-200",
                needs &&
                  dragOverId === row.original.id &&
                  "border-[var(--brand-primary)] bg-[var(--brand-primary-subtle)]",
                needs &&
                  dragOverId !== row.original.id &&
                  "border-slate-200/90 dark:border-slate-700"
              )}
              onDragOver={(e) => {
                if (!needs) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                setDragOverId(row.original.id);
              }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={(e) => {
                if (!needs) return;
                e.preventDefault();
                onDropReceipt(row.original.id);
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{row.original.merchant}</span>
                {needs ? (
                  <Upload className="size-3.5 shrink-0 text-muted-foreground" />
                ) : null}
              </div>
              {needs ? (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Drop receipt PDF/image
                </p>
              ) : null}
            </div>
          );
        },
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
      {
        accessorKey: "cardLabel",
        header: "Card",
        cell: ({ row }) => (
          <span className="font-mono text-[11px]">{row.original.cardLabel}</span>
        ),
      },
      {
        accessorKey: "teamMember",
        header: "Team",
        cell: ({ row }) => <Badge variant="outline">{row.original.teamMember}</Badge>,
      },
    ],
    [dragOverId]
  );

  const selectedCount = Object.keys(rowSelection).filter(
    (k) => rowSelection[k]
  ).length;

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-background">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Card</Label>
          <Select
            value={cardFilter}
            onValueChange={(v) => setCardFilter(v as (typeof CARDS)[number])}
          >
            <SelectTrigger className="h-9 w-[150px] rounded-lg text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cards</SelectItem>
              <SelectItem value="Corp · 4829">Corp · 4829</SelectItem>
              <SelectItem value="Travel · 9912">Travel · 9912</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Team</Label>
          <Select
            value={teamFilter}
            onValueChange={(v) => setTeamFilter(v as (typeof TEAMS)[number])}
          >
            <SelectTrigger className="h-9 w-[140px] rounded-lg text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              <SelectItem value="Engineering">Engineering</SelectItem>
              <SelectItem value="Sales">Sales</SelectItem>
              <SelectItem value="Ops">Ops</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Category</Label>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="h-9 w-[180px] rounded-lg text-xs">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {AP_CATEGORY_OPTIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
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
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />

      <AnimatePresence>
        {selectedCount > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
          >
            <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-full border border-slate-200/90 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95">
              <span className="text-sm text-muted-foreground">
                {selectedCount} selected
              </span>
              <Select value={bulkCat} onValueChange={setBulkCat}>
                <SelectTrigger className="h-9 w-[200px] rounded-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AP_CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                className="rounded-full font-semibold"
                onClick={applyBulkCategory}
              >
                Set category
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
