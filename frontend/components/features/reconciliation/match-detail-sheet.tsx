"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

import { BankTransactionCell } from "./bank-transaction-cell";
import { LedgerInvoiceCell } from "./ledger-invoice-cell";
import { formatReconciliationEUR } from "./reconciliation-money";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  ReconciliationBookInvoice,
  ReconciliationPendingPair,
} from "@/lib/views/reconciliation";
import { cn } from "@/lib/utils";

interface MatchDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pair: ReconciliationPendingPair | null;
  onConfirmMatch: (pairId: string) => void;
  onRejectMatch: (pairId: string) => void;
}

function targetReconcileAmount(transactionAmount: number): number {
  return Math.abs(transactionAmount);
}

function cents(n: number): number {
  return Math.round(n * 100) / 100;
}

export function MatchDetailSheet({
  open,
  onOpenChange,
  pair,
  onConfirmMatch,
  onRejectMatch,
}: MatchDetailSheetProps) {
  const candidates = useMemo(() => {
    if (!pair) return [];
    const raw = pair.matchCandidates?.length
      ? pair.matchCandidates
      : [pair.invoice];
    const byId = new Map<string, ReconciliationBookInvoice>();
    for (const inv of raw) {
      byId.set(inv.id, inv);
    }
    return Array.from(byId.values());
  }, [pair]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!pair) {
      setSelectedIds(new Set());
      return;
    }
    const defaults = pair.matchCandidates?.length
      ? new Set<string>()
      : new Set([pair.invoice.id]);
    setSelectedIds(defaults);
  }, [pair]);

  const target = pair ? targetReconcileAmount(pair.transaction.amount) : 0;
  const allocated = useMemo(() => {
    let sum = 0;
    for (const id of selectedIds) {
      const inv = candidates.find((c) => c.id === id);
      if (inv) sum += inv.totalAmount;
    }
    return cents(sum);
  }, [candidates, selectedIds]);

  const remaining = cents(target - allocated);
  const balanced = Math.abs(remaining) < 0.005;

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full max-h-[100dvh] w-full flex-col gap-0 border-l border-slate-100 bg-white p-0 sm:max-w-xl"
      >
        {pair ? (
          <>
            <SheetHeader className="shrink-0 space-y-1.5 border-b border-slate-100 bg-white/80 px-6 py-5 text-left backdrop-blur-md">
              <SheetTitle className="text-lg font-semibold tracking-tight">
                Review suggested match
              </SheetTitle>
              <SheetDescription className="text-xs tracking-tight text-muted-foreground">
                Select one or more open invoices that fully explain this bank
                line. Remaining balance must be €0.00 to approve.
              </SheetDescription>
            </SheetHeader>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Bank transaction
                </p>
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50 shadow-sm">
                  <BankTransactionCell
                    transaction={pair.transaction}
                    dense={false}
                  />
                </div>

                <Separator className="my-6 bg-slate-100" />

                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Match to invoices
                </p>
                <ul className="mt-3 space-y-2">
                  {candidates.map((inv) => {
                    const checked = selectedIds.has(inv.id);
                    return (
                      <li
                        key={inv.id}
                        className={cn(
                          "flex gap-3 rounded-xl border border-slate-100 bg-slate-50/40 p-3 transition-colors",
                          checked && "border-teal-200/60 bg-[var(--brand-primary-subtle)]"
                        )}
                      >
                        <div className="flex shrink-0 items-start pt-0.5">
                          <Checkbox
                            id={`inv-${inv.id}`}
                            checked={checked}
                            onCheckedChange={() => toggle(inv.id)}
                            aria-label={`Select ${inv.invoiceNumber}`}
                          />
                        </div>
                        <label
                          htmlFor={`inv-${inv.id}`}
                          className="min-w-0 flex-1 cursor-pointer"
                        >
                          <LedgerInvoiceCell invoice={inv} dense={false} />
                        </label>
                      </li>
                    );
                  })}
                </ul>

                <div
                  className="mt-6 rounded-xl border border-slate-200/90 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/30"
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span>Bank line (absolute)</span>
                    <span className="font-mono tabular-nums text-foreground">
                      {formatReconciliationEUR(target)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span>Allocated to selected</span>
                    <span className="font-mono tabular-nums text-foreground">
                      {formatReconciliationEUR(allocated)}
                    </span>
                  </div>
                  <Separator className="my-2 bg-slate-200/80 dark:bg-slate-700" />
                  <div className="flex items-center justify-between text-sm font-semibold tracking-tight">
                    <span
                      className={cn(
                        balanced ? "text-emerald-700 dark:text-emerald-400" : "text-amber-800 dark:text-amber-200"
                      )}
                    >
                      Remaining balance to reconcile
                    </span>
                    <span
                      className={cn(
                        "font-mono tabular-nums",
                        balanced ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"
                      )}
                    >
                      {formatReconciliationEUR(remaining)}
                    </span>
                  </div>
                </div>

                <div
                  className="relative mt-6 overflow-hidden rounded-2xl border border-indigo-200/40 bg-gradient-to-br from-indigo-50/50 via-white/60 to-violet-50/40 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_8px_32px_-12px_rgba(99,102,241,0.2)] backdrop-blur-xl dark:border-indigo-900/35 dark:from-indigo-950/40 dark:via-slate-950/30 dark:to-violet-950/25"
                  role="status"
                >
                  <div
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(129,140,248,0.12),transparent_55%)]"
                    aria-hidden
                  />
                  <div className="relative flex items-center gap-2 text-indigo-950 dark:text-indigo-100">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-indigo-200/50 bg-white/60 shadow-sm backdrop-blur-sm dark:border-indigo-800/50 dark:bg-indigo-950/40">
                      <Sparkles className="size-4 text-indigo-600 dark:text-indigo-300" />
                    </span>
                    <span className="text-sm font-semibold tracking-tight">
                      AI reasoning
                    </span>
                    <span className="ml-auto rounded-md border border-indigo-200/50 bg-white/70 px-2 py-0.5 font-mono text-xs font-medium tabular-nums tracking-tight text-indigo-900 shadow-sm backdrop-blur-sm dark:border-indigo-800/40 dark:bg-indigo-950/50 dark:text-indigo-100">
                      {pair.aiConfidencePercent}% confidence
                    </span>
                  </div>
                  <p className="relative mt-3 text-sm leading-relaxed tracking-tight text-foreground/90">
                    {pair.aiReasoning}
                  </p>
                </div>
              </div>

              <SheetFooter className="shrink-0 gap-2 border-t border-slate-100 bg-white/90 px-6 py-4 backdrop-blur-md">
                <Button
                  type="button"
                  className="w-full rounded-xl shadow-sm"
                  disabled={!balanced}
                  onClick={() => onConfirmMatch(pair.id)}
                >
                  Approve match
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl border-slate-200 text-destructive hover:bg-destructive/5 hover:text-destructive"
                  onClick={() => onRejectMatch(pair.id)}
                >
                  Reject &amp; find alternative
                </Button>
              </SheetFooter>
            </div>
          </>
        ) : (
          <SheetHeader className="sr-only">
            <SheetTitle>Match detail</SheetTitle>
            <SheetDescription>Loading match</SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}
