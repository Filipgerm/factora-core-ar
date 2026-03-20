"use client";

import { CheckCircle2, Link2 } from "lucide-react";
import { motion } from "framer-motion";

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
    <motion.div
      layout
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
      whileHover={isPending ? { scale: 1.002 } : undefined}
      transition={{ type: "spring", stiffness: 520, damping: 38 }}
      className={cn(
        "group overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm transition-all duration-300 ease-out",
        variant === "auto" &&
          "border-emerald-200/70 bg-gradient-to-br from-indigo-50/25 via-emerald-50/30 to-[var(--brand-primary-subtle)]/25 dark:border-emerald-900/45 dark:from-indigo-950/20 dark:via-emerald-950/15",
        isPending &&
          "cursor-pointer hover:border-border/60 hover:bg-muted/40 hover:shadow-md dark:hover:bg-muted/25",
        isPending &&
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      {variant === "auto" ? (
        <div className="flex items-center justify-between border-b border-border/30 bg-background/50 px-4 py-2 backdrop-blur-sm dark:bg-background/30">
          <Badge
            variant="outline"
            className="gap-1 border-emerald-200/80 bg-emerald-50/80 text-xs font-medium tracking-tight text-emerald-800 transition-all duration-300 ease-out dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200"
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
        <div className="border-b border-border/30 md:border-b-0 md:border-r md:border-border/30">
          <BankTransactionCell transaction={pair.transaction} />
        </div>
        <div className="relative">
          {variant === "auto" ? (
            <div
              className="pointer-events-none absolute left-0 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 md:block"
              aria-hidden
            >
              <span className="flex size-8 items-center justify-center rounded-full border border-emerald-200/80 bg-background/80 text-emerald-600 shadow-sm backdrop-blur-sm dark:border-emerald-800 dark:text-emerald-400">
                <Link2 className="size-3.5" />
              </span>
            </div>
          ) : null}
          <LedgerInvoiceCell invoice={pair.invoice} />
        </div>
      </div>
    </motion.div>
  );
}
