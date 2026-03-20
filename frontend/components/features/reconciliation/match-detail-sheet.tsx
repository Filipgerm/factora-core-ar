"use client";

import { Sparkles } from "lucide-react";

import { BankTransactionCell } from "./bank-transaction-cell";
import { LedgerInvoiceCell } from "./ledger-invoice-cell";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ReconciliationPendingPair } from "@/lib/mock-data/dashboard-mocks";

interface MatchDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pair: ReconciliationPendingPair | null;
  onConfirmMatch: (pairId: string) => void;
  onRejectMatch: (pairId: string) => void;
}

export function MatchDetailSheet({
  open,
  onOpenChange,
  pair,
  onConfirmMatch,
  onRejectMatch,
}: MatchDetailSheetProps) {
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
                Compare the bank line with the open invoice before confirming.
              </SheetDescription>
            </SheetHeader>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Side-by-side
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50 shadow-sm">
                    <p className="border-b border-slate-100 bg-white/70 px-3 py-2 text-[11px] font-medium tracking-tight text-muted-foreground backdrop-blur-sm">
                      Bank transaction
                    </p>
                    <BankTransactionCell
                      transaction={pair.transaction}
                      dense={false}
                    />
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50 shadow-sm">
                    <p className="border-b border-slate-100 bg-white/70 px-3 py-2 text-[11px] font-medium tracking-tight text-muted-foreground backdrop-blur-sm">
                      Suggested invoice
                    </p>
                    <LedgerInvoiceCell invoice={pair.invoice} dense={false} />
                  </div>
                </div>

                <Separator className="my-6 bg-slate-100" />

                <div
                  className="relative overflow-hidden rounded-2xl border border-indigo-200/40 bg-gradient-to-br from-indigo-50/50 via-white/60 to-violet-50/40 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_8px_32px_-12px_rgba(99,102,241,0.2)] backdrop-blur-xl dark:border-indigo-900/35 dark:from-indigo-950/40 dark:via-slate-950/30 dark:to-violet-950/25"
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
                  onClick={() => onConfirmMatch(pair.id)}
                >
                  Confirm match
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
