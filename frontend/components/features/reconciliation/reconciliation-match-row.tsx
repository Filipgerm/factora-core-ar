"use client";

import { CheckCircle2, Link2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type {
  ReconciliationAutoMatchedPair,
  ReconciliationPendingPair,
} from "@/lib/mock-data/dashboard-mocks";
import { cn } from "@/lib/utils";

import { BankTransactionCell } from "./bank-transaction-cell";
import { LedgerInvoiceCell } from "./ledger-invoice-cell";

type ReconciliationMatchRowProps =
  | {
      variant: "pending";
      pair: ReconciliationPendingPair;
      onSelect: (pair: ReconciliationPendingPair) => void;
    }
  | {
      variant: "auto";
      pair: ReconciliationAutoMatchedPair;
    };

export function ReconciliationMatchRow(props: ReconciliationMatchRowProps) {
  const { pair, variant } = props;
  const isPending = variant === "pending";

  return (
    <div
      role={isPending ? "button" : undefined}
      tabIndex={isPending ? 0 : undefined}
      onClick={isPending ? () => props.onSelect(props.pair) : undefined}
      onKeyDown={
        isPending
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                props.onSelect(props.pair);
              }
            }
          : undefined
      }
      className={cn(
        "group overflow-hidden rounded-xl border border-slate-200 bg-card transition-all duration-200",
        variant === "auto" &&
          "border-emerald-200/90 bg-gradient-to-br from-emerald-50/50 via-card to-[var(--brand-primary-subtle)]/30 dark:border-emerald-900/50 dark:from-emerald-950/20",
        isPending &&
          "cursor-pointer hover:border-slate-300 hover:bg-slate-50/90 hover:shadow-sm dark:hover:bg-slate-900/40",
        isPending &&
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      {variant === "auto" ? (
        <div className="flex items-center justify-between border-b border-emerald-100/80 bg-emerald-50/40 px-3 py-1.5 dark:border-emerald-900/40 dark:bg-emerald-950/25">
          <Badge
            variant="outline"
            className="gap-0.5 border-emerald-200 bg-emerald-50/90 text-emerald-800 transition-all duration-200 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
          >
            <CheckCircle2 className="size-3" aria-hidden />
            Auto-matched · 100% confidence
          </Badge>
          <span
            className="hidden text-emerald-700 md:inline dark:text-emerald-400"
            aria-hidden
          >
            <Link2 className="size-4" />
          </span>
        </div>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="border-b border-slate-100 md:border-b-0 md:border-r md:border-slate-100">
          <BankTransactionCell transaction={pair.transaction} />
        </div>
        <div className="relative">
          {variant === "auto" ? (
            <div
              className="pointer-events-none absolute left-0 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 md:block"
              aria-hidden
            >
              <span className="flex size-8 items-center justify-center rounded-full border border-emerald-200 bg-card text-emerald-600 shadow-sm dark:border-emerald-800 dark:text-emerald-400">
                <Link2 className="size-3.5" />
              </span>
            </div>
          ) : null}
          <LedgerInvoiceCell invoice={pair.invoice} />
        </div>
      </div>
    </div>
  );
}
