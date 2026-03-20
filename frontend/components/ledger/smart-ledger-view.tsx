"use client";

import { useCallback, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
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
import { cn } from "@/lib/utils";

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
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <Card className="overflow-hidden rounded-2xl border border-dashed border-border/50 bg-muted/5 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-5 px-8 py-16">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-border/40 bg-background/60 backdrop-blur-md">
              <Building2 className="size-7 text-muted-foreground" aria-hidden />
            </div>
            <div className="max-w-sm text-center">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                No ledger activity yet
              </h2>
              <p className="mt-1 text-sm tracking-tight text-muted-foreground">
                Import invoices or connect your ERP to populate counterparties
                and parsed documents.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-border/40 transition-all duration-300 ease-out hover:bg-muted/50"
            >
              Import data
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <LayoutGroup>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <Card className="overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-b from-card to-muted/5 shadow-sm">
          <CardHeader className="sticky top-0 z-20 space-y-1 border-b border-border/40 bg-background/60 px-6 py-6 backdrop-blur-md">
            <CardTitle className="text-lg font-semibold tracking-tight">
              Counterparties &amp; invoices
            </CardTitle>
            <CardDescription className="text-xs tracking-tight text-muted-foreground">
              Parsed documents with AI confidence and Greek registry (GEMI)
              status.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 bg-muted/15 hover:bg-transparent">
                  <TableHead className="h-11 min-w-[200px] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Counterparty
                  </TableHead>
                  <TableHead className="h-11 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    VAT
                  </TableHead>
                  <TableHead className="h-11 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    GEMI
                  </TableHead>
                  <TableHead className="h-11 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Invoice
                  </TableHead>
                  <TableHead className="h-11 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Issued
                  </TableHead>
                  <TableHead className="h-11 px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Amount
                  </TableHead>
                  <TableHead className="h-11 min-w-[220px] px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Category
                  </TableHead>
                  <TableHead className="h-11 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    AI
                  </TableHead>
                </TableRow>
              </TableHeader>
                <TableBody>
                  <AnimatePresence initial={false}>
                    {rows.map(({ invoice, counterparty }, i) => (
                      <motion.tr
                        key={invoice.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{
                          duration: 0.35,
                          ease: [0.16, 1, 0.3, 1],
                          delay: Math.min(i * 0.018, 0.18),
                          layout: { duration: 0.35 },
                        }}
                        className={cn(
                          "border-b border-border/40 transition-all duration-300 ease-out",
                          "hover:bg-muted/50",
                          (invoice.aiConfidence === "high" ||
                            invoice.aiConfidence === "medium") &&
                            "bg-indigo-50/[0.2] dark:bg-indigo-950/15"
                        )}
                      >
                        <TableCell className="max-w-[260px] whitespace-normal px-4 py-3.5 align-top">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium tracking-tight text-foreground">
                              {counterparty.legalName}
                            </span>
                            {invoice.description ? (
                              <span className="line-clamp-2 text-xs tracking-tight text-muted-foreground">
                                {invoice.description}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-top font-mono text-xs tabular-nums tracking-tight text-muted-foreground">
                          {counterparty.vatId}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-top">
                          <GemiStatusBadge counterparty={counterparty} />
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-top font-mono text-sm tabular-nums tracking-tight text-foreground">
                          {invoice.number}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-top text-sm tabular-nums tracking-tight text-muted-foreground">
                          {format(parseISO(invoice.issueDate), "d MMM yyyy")}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 text-right align-top text-sm font-medium tabular-nums tracking-tight text-foreground">
                          {formatMoneyEUR(invoice.amount)}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-top">
                          <CategoryAiCell
                            invoiceId={invoice.id}
                            suggestedCategory={invoice.suggestedCategory}
                            aiConfidence={invoice.aiConfidence}
                            verifiedCategory={categoryByInvoiceId[invoice.id]}
                            onCategoryVerified={onCategoryVerified}
                          />
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-top">
                          <AiConfidenceBadge level={invoice.aiConfidence} />
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </LayoutGroup>
  );
}
