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
        className="flex w-full flex-col gap-0 border-slate-200 p-0 sm:max-w-xl"
      >
        {pair ? (
          <>
            <SheetHeader className="space-y-1 border-b border-slate-100 px-6 py-5 text-left">
              <SheetTitle className="text-lg font-semibold">
                Review suggested match
              </SheetTitle>
              <SheetDescription>
                Compare the bank line with the open invoice before confirming.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Side-by-side
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 dark:bg-slate-900/30">
                  <p className="border-b border-slate-200 px-3 py-2 text-xs font-medium text-muted-foreground dark:border-slate-700">
                    Bank transaction
                  </p>
                  <BankTransactionCell
                    transaction={pair.transaction}
                    dense={false}
                  />
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 dark:bg-slate-900/30">
                  <p className="border-b border-slate-200 px-3 py-2 text-xs font-medium text-muted-foreground dark:border-slate-700">
                    Suggested invoice
                  </p>
                  <LedgerInvoiceCell invoice={pair.invoice} dense={false} />
                </div>
              </div>

              <Separator className="my-6" />

              <div
                className="rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/95 via-card to-[var(--brand-primary-subtle)]/50 p-4 shadow-sm dark:border-violet-900/50 dark:from-violet-950/35"
                role="status"
              >
                <div className="flex items-center gap-2 text-violet-800 dark:text-violet-200">
                  <Sparkles className="size-4 shrink-0" aria-hidden />
                  <span className="text-sm font-semibold">AI reasoning</span>
                  <span className="ml-auto rounded-md bg-violet-100 px-2 py-0.5 text-xs font-medium tabular-nums text-violet-900 dark:bg-violet-900/60 dark:text-violet-100">
                    {pair.aiConfidencePercent}% confidence
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                  {pair.aiReasoning}
                </p>
              </div>
            </div>

            <SheetFooter className="flex-col gap-2 border-t border-slate-100 bg-slate-50/40 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/40 sm:flex-col">
              <Button
                type="button"
                className="w-full transition-all duration-200"
                onClick={() => onConfirmMatch(pair.id)}
              >
                Confirm match
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive dark:border-destructive/50"
                onClick={() => onRejectMatch(pair.id)}
              >
                Reject &amp; find alternative
              </Button>
            </SheetFooter>
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
