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

const SNAP_SPRING = { type: "spring" as const, stiffness: 640, damping: 44 };

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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SNAP_SPRING}
      >
        <Card className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.08)]">
          <CardContent className="flex flex-col items-center justify-center gap-5 px-8 py-16">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/80">
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
              className="rounded-xl border-slate-200 transition-all duration-200 hover:bg-slate-50"
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
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SNAP_SPRING}
      >
        <Card className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.08)]">
          <CardHeader className="sticky top-0 z-20 shrink-0 space-y-1 border-b border-slate-100 bg-white/75 px-6 py-5 backdrop-blur-md">
            <CardTitle className="text-base font-semibold tracking-tight">
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
                <TableRow className="border-slate-100 bg-slate-50/80 hover:bg-transparent">
                  <TableHead className="h-9 min-w-[200px] px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Counterparty
                  </TableHead>
                  <TableHead className="h-9 px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    VAT
                  </TableHead>
                  <TableHead className="h-9 px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    GEMI
                  </TableHead>
                  <TableHead className="h-9 px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Invoice
                  </TableHead>
                  <TableHead className="h-9 px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Issued
                  </TableHead>
                  <TableHead className="h-9 px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Amount
                  </TableHead>
                  <TableHead className="h-9 min-w-[200px] px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Category
                  </TableHead>
                  <TableHead className="h-9 px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
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
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{
                        ...SNAP_SPRING,
                        delay: Math.min(i * 0.012, 0.1),
                        layout: {
                          type: "spring",
                          stiffness: 680,
                          damping: 46,
                        },
                      }}
                      className={cn(
                        "border-b border-slate-100 transition-colors duration-200 hover:bg-slate-50/80",
                        (invoice.aiConfidence === "high" ||
                          invoice.aiConfidence === "medium") &&
                          "bg-gradient-to-r from-indigo-50/35 via-white to-white dark:from-indigo-950/20"
                      )}
                    >
                      <TableCell className="max-w-[260px] whitespace-normal px-3 py-2 align-top">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] font-medium leading-snug tracking-tight text-foreground">
                            {counterparty.legalName}
                          </span>
                          {invoice.description ? (
                            <span className="line-clamp-2 text-[12px] tracking-tight text-muted-foreground">
                              {invoice.description}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2 align-top font-mono text-[13px] tabular-nums tracking-tight text-muted-foreground">
                        {counterparty.vatId}
                      </TableCell>
                      <TableCell className="px-3 py-2 align-top">
                        <GemiStatusBadge counterparty={counterparty} />
                      </TableCell>
                      <TableCell className="px-3 py-2 align-top font-mono text-[13px] tabular-nums tracking-tight text-foreground">
                        {invoice.number}
                      </TableCell>
                      <TableCell className="px-3 py-2 align-top font-mono text-[13px] tabular-nums tracking-tight text-muted-foreground">
                        {format(parseISO(invoice.issueDate), "d MMM yyyy")}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right align-top font-mono text-[13px] font-semibold tabular-nums tracking-tight text-foreground">
                        {formatMoneyEUR(invoice.amount)}
                      </TableCell>
                      <TableCell className="px-3 py-2 align-top">
                        <CategoryAiCell
                          invoiceId={invoice.id}
                          suggestedCategory={invoice.suggestedCategory}
                          aiConfidence={invoice.aiConfidence}
                          verifiedCategory={categoryByInvoiceId[invoice.id]}
                          onCategoryVerified={onCategoryVerified}
                        />
                      </TableCell>
                      <TableCell className="px-3 py-2 align-top">
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
