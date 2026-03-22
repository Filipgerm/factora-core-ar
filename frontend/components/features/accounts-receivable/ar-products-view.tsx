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
import type { ArProduct } from "@/lib/mock-data/ar-mocks";
import { mockArProducts } from "@/lib/mock-data/ar-mocks";
import { useToast } from "@/hooks/use-toast";

function fmtEUR(n: number) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 3,
  }).format(n);
}

export function ArProductsView() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ArProduct[]>(() => [...mockArProducts]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const columns: ColumnDef<ArProduct>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        id: "price",
        header: "Default price / tiers",
        cell: ({ row }) => (
          <div className="max-w-[200px] text-sm">
            <span className="font-mono font-semibold tabular-nums">
              {fmtEUR(row.original.defaultPrice)}
            </span>
            {row.original.priceTiers ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {row.original.priceTiers}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "vatRate",
        header: () => <span className="text-right">VAT %</span>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-sm tabular-nums">
            {row.original.vatRate}%
          </div>
        ),
      },
      {
        accessorKey: "glAccount",
        header: "GL account",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.glAccount}
          </span>
        ),
      },
      {
        accessorKey: "mydataCategoryCode",
        header: "myDATA code",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.mydataCategoryCode}</span>
        ),
      },
      {
        accessorKey: "deferredRevenue",
        header: "Deferred",
        cell: ({ row }) =>
          row.original.deferredRevenue ? (
            <Badge variant="secondary">Yes</Badge>
          ) : (
            <span className="text-muted-foreground">No</span>
          ),
      },
      {
        accessorKey: "recognitionPeriod",
        header: "Recognition",
        cell: ({ row }) => (
          <span className="text-xs">{row.original.recognitionPeriod}</span>
        ),
      },
    ],
    []
  );

  const addProduct = () => {
    const p = parseFloat(price.replace(",", "."));
    if (!name.trim() || Number.isNaN(p)) {
      toast({ title: "Check name and price", variant: "destructive" });
      return;
    }
    const id = `pr-${Date.now()}`;
    setRows((r) => [
      ...r,
      {
        id,
        name: name.trim(),
        defaultPrice: p,
        priceTiers: null,
        vatRate: 24,
        glAccount: "4100 — Subscription revenue",
        mydataCategoryCode: "E3_561_001",
        deferredRevenue: false,
        recognitionPeriod: "Monthly",
      },
    ]);
    toast({ title: "Product added (demo)" });
    setName("");
    setPrice("");
    setOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" className="rounded-lg transition-all duration-200">
              Add product
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add product</DialogTitle>
              <DialogDescription>
                Mock-only: appended to this session&apos;s table state.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="np-name">Name</Label>
                <Input
                  id="np-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="np-price">Default price (EUR)</Label>
                <Input
                  id="np-price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="499"
                  className="rounded-lg font-mono"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={addProduct}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable columns={columns} data={rows} getRowId={(r) => r.id} />
    </div>
  );
}
