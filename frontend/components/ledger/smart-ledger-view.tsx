"use client";

import { useCallback, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Building2 } from "lucide-react";

import { AiConfidenceBadge } from "@/components/ledger/ai-confidence-badge";
import { CategoryAiCell } from "@/components/ledger/category-ai-cell";
import { GemiStatusBadge } from "@/components/ledger/gemi-status-badge";
import { Button } from "@/components/ui/button";
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
import type {
  LedgerCategory,
  MockCounterparty,
  MockInvoice,
} from "@/lib/mock-data/dashboard-mocks";
import {
  mockCounterparties,
  mockInvoices,
  SHOW_EMPTY_DEMO,
} from "@/lib/mock-data/dashboard-mocks";

function formatMoneyEUR(value: number) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

type LedgerRow = {
  invoice: MockInvoice;
  counterparty: MockCounterparty;
};

export function SmartLedgerView() {
  const [categoryByInvoiceId, setCategoryByInvoiceId] = useState<
    Partial<Record<string, LedgerCategory>>
  >({});

  const counterparties = SHOW_EMPTY_DEMO ? [] : mockCounterparties;
  const invoices = SHOW_EMPTY_DEMO ? [] : mockInvoices;

  const cpMap = useMemo(() => {
    const m = new Map<string, MockCounterparty>();
    counterparties.forEach((c) => m.set(c.id, c));
    return m;
  }, [counterparties]);

  const rows: LedgerRow[] = useMemo(() => {
    return invoices
      .map((inv) => {
        const counterparty = cpMap.get(inv.counterpartyId);
        if (!counterparty) return null;
        return { invoice: inv, counterparty };
      })
      .filter((r): r is LedgerRow => r !== null);
  }, [invoices, cpMap]);

  const onCategoryVerified = useCallback(
    (invoiceId: string, category: LedgerCategory) => {
      setCategoryByInvoiceId((prev) => ({ ...prev, [invoiceId]: category }));
    },
    []
  );

  if (rows.length === 0) {
    return (
      <Card className="border-2 border-dashed border-slate-200 bg-card/40 shadow-none transition-all duration-200">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="flex size-14 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50">
            <Building2 className="size-7 text-slate-400" aria-hidden />
          </div>
          <div className="max-w-sm text-center">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              No ledger activity yet
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Import invoices or connect your ERP to populate counterparties and
              parsed documents.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="transition-all duration-200"
          >
            Import data
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm transition-all duration-200">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-lg font-semibold tracking-tight">
          Counterparties &amp; invoices
        </CardTitle>
        <CardDescription>
          Parsed documents with AI confidence and Greek registry (GEMI) status.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="h-9 min-w-[200px] px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Counterparty
                </TableHead>
                <TableHead className="h-9 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  VAT
                </TableHead>
                <TableHead className="h-9 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  GEMI
                </TableHead>
                <TableHead className="h-9 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Invoice
                </TableHead>
                <TableHead className="h-9 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Issued
                </TableHead>
                <TableHead className="h-9 px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Amount
                </TableHead>
                <TableHead className="h-9 min-w-[220px] px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Category
                </TableHead>
                <TableHead className="h-9 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  AI
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ invoice, counterparty }) => (
                <TableRow
                  key={invoice.id}
                  className="border-slate-100 transition-all duration-200 hover:bg-slate-50/90"
                >
                  <TableCell className="max-w-[240px] px-3 py-2.5 align-top">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">
                        {counterparty.legalName}
                      </span>
                      {invoice.description ? (
                        <span className="line-clamp-2 text-xs text-muted-foreground">
                          {invoice.description}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-top font-mono text-xs text-muted-foreground tabular-nums">
                    {counterparty.vatId}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-top">
                    <GemiStatusBadge counterparty={counterparty} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-top font-mono text-sm tabular-nums text-foreground">
                    {invoice.number}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-top text-sm tabular-nums text-muted-foreground">
                    {format(parseISO(invoice.issueDate), "d MMM yyyy")}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-right align-top text-sm font-medium tabular-nums text-foreground">
                    {formatMoneyEUR(invoice.amount)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-top">
                    <CategoryAiCell
                      invoiceId={invoice.id}
                      suggestedCategory={invoice.suggestedCategory}
                      aiConfidence={invoice.aiConfidence}
                      verifiedCategory={categoryByInvoiceId[invoice.id]}
                      onCategoryVerified={onCategoryVerified}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-top">
                    <AiConfidenceBadge level={invoice.aiConfidence} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
