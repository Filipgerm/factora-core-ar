"use client";

import {
  ArrowDownToLine,
  ArrowUpToLine,
  CheckCircle2,
  Landmark,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  ReconciliationAutoMatchedPair,
  ReconciliationBankId,
  ReconciliationPendingPair,
} from "@/lib/mock-data/dashboard-mocks";
import { cn } from "@/lib/utils";

import {
  formatReconciliationDate,
  formatReconciliationEUR,
} from "./reconciliation-money";

const HIGH_CONFIDENCE_THRESHOLD = 80;

const BANK_LABEL: Record<ReconciliationBankId, string> = {
  eurobank: "Eurobank",
  revolut: "Revolut",
  n26: "N26",
  deutschebank: "Deutsche Bank",
  piraeus: "Piraeus Bank",
};

const BANK_ACCENT: Record<ReconciliationBankId, string> = {
  eurobank: "bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]",
  revolut:
    "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  n26: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  deutschebank:
    "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
  piraeus: "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300",
};

function cashflowAmountClass(isOutflow: boolean) {
  return cn(
    "font-mono text-[12px] tabular-nums tracking-tight",
    isOutflow
      ? "font-bold text-foreground"
      : "font-semibold text-emerald-600 dark:text-emerald-400"
  );
}

function formatSignedLedgerAmount(
  invoiceAmount: number,
  bankIsOutflow: boolean
): string {
  const abs = formatReconciliationEUR(Math.abs(invoiceAmount));
  return bankIsOutflow ? `−${abs}` : `+${abs}`;
}

type ReconciliationMatchRowProps =
  | {
      variant: "pending";
      pair: ReconciliationPendingPair;
      onConfirm: (pairId: string) => void;
      onReview: (pair: ReconciliationPendingPair) => void;
    }
  | {
      variant: "auto";
      pair: ReconciliationAutoMatchedPair;
    };

export function ReconciliationMatchRow(props: ReconciliationMatchRowProps) {
  const { pair, variant } = props;
  const { transaction, invoice } = pair;
  const isPending = variant === "pending";
  const bankOutflow = transaction.amount < 0;
  const bankAbs = formatReconciliationEUR(Math.abs(transaction.amount));
  const bankSigned = bankOutflow ? `−${bankAbs}` : `+${bankAbs}`;
  const bookSigned = formatSignedLedgerAmount(
    invoice.totalAmount,
    bankOutflow
  );

  const isHighConfidence =
    isPending && pair.aiConfidencePercent >= HIGH_CONFIDENCE_THRESHOLD;

  return (
    <div
      className={cn(
        "group grid w-full grid-cols-1 border-b border-border/40 transition-colors duration-200 hover:bg-muted/30 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(7.25rem,auto)]"
      )}
    >
      {/* Bank */}
      <div
        className={cn(
          "flex min-w-0 items-start gap-2 border-border/40 py-2 pl-1 pr-2 md:border-r md:bg-muted/25 md:py-1.5"
        )}
      >
        <div
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md transition-colors duration-200",
            BANK_ACCENT[transaction.bankId]
          )}
          aria-hidden
        >
          <Landmark className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold leading-tight tracking-tight text-foreground">
            {transaction.merchant}
          </p>
          <p
            className="mt-0.5 line-clamp-2 break-all font-mono text-[10px] leading-snug tracking-tight text-muted-foreground"
            title={transaction.rawDescriptor}
          >
            {transaction.rawDescriptor}
          </p>
          <p className="mt-0.5 font-mono text-[10px] tabular-nums tracking-tight text-muted-foreground">
            {BANK_LABEL[transaction.bankId]} · {transaction.maskedAccount}
            {transaction.memo ? ` · ${transaction.memo}` : ""}
          </p>
        </div>
        <div className="shrink-0 space-y-0.5 text-right">
          <p className="font-mono text-[12px] tabular-nums tracking-tight text-muted-foreground">
            {formatReconciliationDate(transaction.date)}
          </p>
          <p className={cashflowAmountClass(bankOutflow)}>{bankSigned}</p>
        </div>
      </div>

      {/* Factora (book) */}
      <div className="flex min-w-0 items-start gap-2 border-border/40 py-2 pl-1 pr-1 md:border-r md:py-1.5 md:pl-2">
        <div
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground"
          )}
          title={invoice.role}
        >
          {invoice.role === "AR" ? (
            <ArrowUpToLine className="size-3.5" aria-hidden />
          ) : (
            <ArrowDownToLine className="size-3.5" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="text-[12px] font-semibold leading-tight tracking-tight text-foreground">
              {invoice.counterpartyName}
            </span>
            <span className="rounded border border-border/60 px-1 py-px font-mono text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
              {invoice.role}
            </span>
            <span
              className={cn(
                "rounded px-1 py-px font-mono text-[9px] font-medium uppercase tracking-wide",
                invoice.status === "Overdue"
                  ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
                  : "bg-muted/80 text-muted-foreground"
              )}
            >
              {invoice.status}
            </span>
          </div>
          <p className="mt-0.5 font-mono text-[11px] tabular-nums tracking-tight text-muted-foreground">
            {invoice.invoiceNumber}
          </p>
          <p
            className="mt-0.5 line-clamp-2 font-mono text-[11px] leading-snug tracking-tight text-foreground/90"
            title={invoice.glAccount}
          >
            {invoice.glAccount}
          </p>
        </div>
        <div className="shrink-0 space-y-0.5 text-right">
          <p className={cashflowAmountClass(bankOutflow)}>{bookSigned}</p>
          <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
            Due {formatReconciliationDate(invoice.dueDate)}
          </p>
        </div>
      </div>

      {/* AI action */}
      <div className="flex items-center justify-end gap-1.5 py-2 pr-1 md:py-1.5 md:pr-2">
        {variant === "auto" ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium tabular-nums text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="size-3 shrink-0" aria-hidden />
            Matched
          </span>
        ) : isHighConfidence ? (
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1 bg-primary/12 px-2.5 text-[11px] font-medium text-primary shadow-none hover:bg-primary/18 dark:bg-primary/20 dark:hover:bg-primary/28"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              props.onConfirm(pair.id);
            }}
          >
            <Sparkles className="size-3" aria-hidden />
            Confirm
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 border-border/70 px-2.5 text-[11px] font-medium shadow-none"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              props.onReview(pair);
            }}
          >
            Review
          </Button>
        )}
      </div>
    </div>
  );
}
