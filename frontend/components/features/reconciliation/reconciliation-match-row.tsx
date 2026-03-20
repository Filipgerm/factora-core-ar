"use client";

import { CheckCircle2, GitMerge, Link2 } from "lucide-react";
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

const SNAP_SPRING = { type: "spring" as const, stiffness: 640, damping: 44 };

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
      whileHover={isPending ? { y: -1 } : undefined}
      transition={SNAP_SPRING}
      className={cn(
        "group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-14px_rgba(15,23,42,0.09)] transition-shadow duration-200",
        variant === "auto" &&
          "border-indigo-100/60 bg-gradient-to-br from-white via-indigo-50/25 to-emerald-50/35 shadow-[0_1px_2px_rgba(99,102,241,0.06),0_12px_32px_-12px_rgba(47,154,138,0.12)]",
        isPending &&
          "cursor-pointer hover:border-slate-200/90 hover:shadow-[0_2px_8px_rgba(15,23,42,0.06)]",
        isPending &&
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      {variant === "auto" ? (
        <div className="flex items-center justify-between border-b border-slate-100/90 bg-gradient-to-r from-indigo-50/40 via-white to-emerald-50/30 px-3 py-1.5 backdrop-blur-[2px]">
          <Badge
            variant="outline"
            className="gap-1 border-emerald-200/70 bg-emerald-50/90 text-[11px] font-medium tracking-tight text-emerald-800 shadow-sm dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-200"
          >
            <CheckCircle2 className="size-3" aria-hidden />
            Auto-matched · 100% confidence
          </Badge>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_2.75rem_minmax(0,1fr)]">
        <div className="border-b border-slate-100 bg-slate-50/80 md:border-b-0 md:border-r md:border-slate-100">
          <BankTransactionCell transaction={pair.transaction} />
        </div>

        <div
          className={cn(
            "flex min-h-[3.5rem] items-center justify-center border-b border-slate-100 bg-white md:border-b-0 md:border-x md:border-slate-100",
            variant === "auto"
              ? "bg-gradient-to-b from-indigo-50/30 via-white to-emerald-50/25"
              : "md:bg-slate-50/60"
          )}
          aria-hidden
        >
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-full border shadow-sm",
              variant === "auto"
                ? "border-emerald-200/80 bg-white/90 text-emerald-600 ring-2 ring-indigo-100/50 dark:border-emerald-800 dark:text-emerald-400"
                : "border-slate-200 bg-white text-slate-500"
            )}
          >
            {variant === "auto" ? (
              <Link2 className="size-3.5" />
            ) : (
              <GitMerge className="size-3.5" />
            )}
          </span>
        </div>

        <div className="bg-white">
          <LedgerInvoiceCell invoice={pair.invoice} />
        </div>
      </div>
    </motion.div>
  );
}
