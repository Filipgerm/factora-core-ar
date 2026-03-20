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
        className="flex w-full flex-col gap-0 border-border/40 p-0 sm:max-w-xl"
      >
        {pair ? (
          <>
            <SheetHeader className="space-y-1.5 border-b border-border/40 bg-background/60 px-6 py-6 text-left backdrop-blur-md">
              <SheetTitle className="text-lg font-semibold tracking-tight">
                Review suggested match
              </SheetTitle>
              <SheetDescription className="text-xs tracking-tight text-muted-foreground">
                Compare the bank line with the open invoice before confirming.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Side-by-side
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div className="overflow-hidden rounded-xl border border-border/40 bg-muted/10 shadow-sm">
                  <p className="border-b border-border/40 bg-background/40 px-3 py-2 text-xs font-medium tracking-tight text-muted-foreground backdrop-blur-sm">
                    Bank transaction
                  </p>
                  <BankTransactionCell
                    transaction={pair.transaction}
                    dense={false}
                  />
                </div>
                <div className="overflow-hidden rounded-xl border border-border/40 bg-muted/10 shadow-sm">
                  <p className="border-b border-border/40 bg-background/40 px-3 py-2 text-xs font-medium tracking-tight text-muted-foreground backdrop-blur-sm">
                    Suggested invoice
                  </p>
                  <LedgerInvoiceCell invoice={pair.invoice} dense={false} />
                </div>
              </div>

              <Separator className="my-6 bg-border/40" />

              <div
                className="rounded-xl border border-indigo-200/50 bg-gradient-to-br from-indigo-50/40 via-violet-50/25 to-[var(--brand-primary-subtle)]/30 p-4 shadow-sm dark:border-indigo-900/40 dark:from-indigo-950/30 dark:via-violet-950/20"
                role="status"
              >
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
                  <Sparkles className="size-4 shrink-0" aria-hidden />
                  <span className="text-sm font-semibold tracking-tight">
                    AI reasoning
                  </span>
                  <span className="ml-auto rounded-md bg-indigo-100/90 px-2 py-0.5 text-xs font-medium tabular-nums tracking-tight text-indigo-900 dark:bg-indigo-900/55 dark:text-indigo-100">
                    {pair.aiConfidencePercent}% confidence
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed tracking-tight text-foreground/90">
                  {pair.aiReasoning}
                </p>
              </div>
            </div>

            <SheetFooter className="flex-col gap-2 border-t border-border/40 bg-background/50 px-6 py-5 backdrop-blur-md sm:flex-col">
              <Button
                type="button"
                className="w-full rounded-xl transition-all duration-300 ease-out"
                onClick={() => onConfirmMatch(pair.id)}
              >
                Confirm match
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl border-destructive/35 text-destructive transition-all duration-300 ease-out hover:bg-destructive/10 hover:text-destructive dark:border-destructive/45"
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
