"use client";

import { useCallback, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";

import {
  SourceDocumentSheet,
  type SourceDocField,
} from "@/components/ledger/source-document-sheet";
import { AiConfidenceBadge } from "@/components/ledger/ai-confidence-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MockCounterparty, MockInvoice } from "@/lib/mock-data/dashboard-mocks";
import {
  mockCounterparties,
  mockInvoices,
  SHOW_EMPTY_DEMO,
} from "@/lib/mock-data/dashboard-mocks";
import { cn } from "@/lib/utils";

function formatMoneyEUR(value: number) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

type BillRow = { invoice: MockInvoice; vendor: MockCounterparty };

function fieldsForBill({ invoice, vendor }: BillRow): SourceDocField[] {
  return [
    { key: "vendor", label: "Vendor", value: vendor.legalName },
    { key: "vat", label: "VAT ID", value: vendor.vatId },
    { key: "num", label: "Bill number", value: invoice.number },
    { key: "amt", label: "Amount (EUR)", value: String(invoice.amount) },
    { key: "due", label: "Due date", value: invoice.dueDate },
    { key: "desc", label: "Description", value: invoice.description ?? "" },
    {
      key: "cat",
      label: "Suggested category",
      value: invoice.suggestedCategory,
    },
  ];
}

export function ApBillsView() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [active, setActive] = useState<BillRow | null>(null);

  const counterparties = SHOW_EMPTY_DEMO ? [] : mockCounterparties;
  const invoices = SHOW_EMPTY_DEMO ? [] : mockInvoices;

  const cpMap = useMemo(() => {
    const m = new Map<string, MockCounterparty>();
    counterparties.forEach((c) => m.set(c.id, c));
    return m;
  }, [counterparties]);

  const rows: BillRow[] = useMemo(() => {
    return invoices
      .map((inv) => {
        const vendor = cpMap.get(inv.counterpartyId);
        if (!vendor) return null;
        return { invoice: inv, vendor };
      })
      .filter((r): r is BillRow => r !== null);
  }, [invoices, cpMap]);

  const openRow = useCallback((row: BillRow) => {
    setActive(row);
    setSheetOpen(true);
  }, []);

  if (rows.length === 0) {
    return (
      <Card className="rounded-2xl border border-dashed border-slate-200/90 bg-white dark:border-slate-800 dark:bg-background">
        <CardHeader>
          <CardTitle className="text-lg font-semibold tracking-tight">
            No bills
          </CardTitle>
          <CardDescription>
            Import vendor bills to see them here with source document preview.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-background">
        <CardHeader className="border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <CardTitle className="text-lg font-semibold tracking-tight">
            Bills
          </CardTitle>
          <CardDescription className="text-sm tracking-tight">
            Vendor bills — click a row to review extracted fields alongside the
            original document.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 bg-slate-50/80 hover:bg-transparent dark:border-slate-800">
                <TableHead className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Vendor
                </TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Bill #
                </TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Due
                </TableHead>
                <TableHead className="text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Amount
                </TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  AI
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ invoice, vendor }) => (
                <TableRow
                  key={invoice.id}
                  className={cn(
                    "cursor-pointer border-slate-100 transition-colors duration-200 hover:bg-slate-50/90 dark:border-slate-800 dark:hover:bg-slate-900/40"
                  )}
                  onClick={(e) => {
                    const t = e.target as HTMLElement;
                    if (t.closest("button") || t.closest('[role="checkbox"]')) {
                      return;
                    }
                    openRow({ invoice, vendor });
                  }}
                >
                  <TableCell className="max-w-[240px] font-medium tracking-tight">
                    {vendor.legalName}
                  </TableCell>
                  <TableCell className="font-mono text-sm tabular-nums text-foreground">
                    {invoice.number}
                  </TableCell>
                  <TableCell className="font-mono text-sm tabular-nums text-muted-foreground">
                    {format(parseISO(invoice.dueDate), "d MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">
                    {formatMoneyEUR(invoice.amount)}
                  </TableCell>
                  <TableCell>
                    <AiConfidenceBadge level={invoice.aiConfidence} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {active ? (
        <SourceDocumentSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={`Bill ${active.invoice.number}`}
          subtitle={active.vendor.legalName}
          fields={fieldsForBill(active)}
        />
      ) : null}
    </>
  );
}
