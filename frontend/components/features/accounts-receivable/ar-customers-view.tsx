"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { Users } from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";
import { CounterpartyVatDialog } from "@/components/features/organization/counterparty-vat-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCounterpartiesQuery } from "@/lib/hooks/api/use-organization";
import {
  counterpartyToArCustomer,
  isCustomerType,
} from "@/lib/organization/counterparty-mappers";
import type { ArCountry, ArCustomer } from "@/lib/views/ar";
import { enrichArCustomerRow } from "@/lib/views/ar-counterparty-context";
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
  const router = useRouter();
  const { data: counterparties, isLoading } = useCounterpartiesQuery();
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [country, setCountry] = useState<ArCountry | "all">("all");
  const [terms, setTerms] = useState<(typeof PAYMENT_TERMS)[number]>("all");
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);

  const customers = useMemo(
    () =>
      (counterparties ?? [])
        .filter((c) => isCustomerType(c.type))
        .map((c) =>
          enrichArCustomerRow(counterpartyToArCustomer(c), c)
        ),
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
          description="Add a customer with VAT lookup from the Business Registry, or manage counterparties from integrations later."
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
              <SelectItem value="SE">Sweden</SelectItem>
              <SelectItem value="EE">Estonia</SelectItem>
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
          router.push(`/accounts-receivable/customers/${row.id}`);
        }}
      />
    </div>
  );
}
