import { Landmark } from "lucide-react";

import type {
  ReconciliationBankId,
  ReconciliationBankTransaction,
} from "@/lib/mock-data/dashboard-mocks";
import { cn } from "@/lib/utils";

import { formatReconciliationDate, formatReconciliationEUR } from "./reconciliation-money";

const BANK_LABEL: Record<ReconciliationBankId, string> = {
  eurobank: "Eurobank",
  revolut: "Revolut",
  n26: "N26",
  deutschebank: "Deutsche Bank",
  piraeus: "Piraeus Bank",
};

const BANK_ACCENT: Record<ReconciliationBankId, string> = {
  eurobank: "bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]",
  revolut: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  n26: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  deutschebank: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
  piraeus: "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300",
};

interface BankTransactionCellProps {
  transaction: ReconciliationBankTransaction;
  dense?: boolean;
}

export function BankTransactionCell({
  transaction,
  dense = true,
}: BankTransactionCellProps) {
  const { date, amount, merchant, bankId, maskedAccount, memo, rawDescriptor } =
    transaction;
  const isOutflow = amount < 0;
  const displayAmount = Math.abs(amount);

  return (
    <div
      className={cn(
        "flex gap-3",
        dense ? "py-2 pl-3 pr-2 md:pr-3" : "p-4"
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
          BANK_ACCENT[bankId]
        )}
        aria-hidden
      >
        <Landmark className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium leading-snug tracking-tight text-foreground">
          {merchant}
        </p>
        <p
          className="mt-1 line-clamp-2 break-all font-mono text-[11px] leading-relaxed tracking-tight text-muted-foreground/85"
          title={rawDescriptor}
        >
          {rawDescriptor}
        </p>
        <p className="mt-1 font-mono text-[11px] tabular-nums tracking-tight text-muted-foreground">
          {BANK_LABEL[bankId]} · {maskedAccount}
        </p>
        {memo ? (
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/80">
            {memo}
          </p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="font-mono text-[13px] tabular-nums tracking-tight text-muted-foreground">
            {formatReconciliationDate(date)}
          </span>
          <span
            className={cn(
              "font-mono text-[13px] font-semibold tabular-nums tracking-tight",
              isOutflow ? "text-foreground" : "text-emerald-700 dark:text-emerald-400"
            )}
          >
            {isOutflow ? "−" : "+"}
            {formatReconciliationEUR(displayAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}
