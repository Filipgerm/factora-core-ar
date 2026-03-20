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

/** Must stay in sync with column sub-grids in `reconciliation-view.tsx`. */
export const RECON_ROW_OUTER =
  "md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(7.25rem,auto)]";
export const RECON_BANK_INNER =
  "md:grid md:grid-cols-[4.25rem_minmax(0,1fr)_6.25rem_5rem] md:gap-x-2 md:items-start md:px-2";
export const RECON_BOOK_INNER =
  "md:grid md:grid-cols-[minmax(0,1fr)_minmax(6.5rem,9rem)_4.75rem] md:gap-x-2 md:items-start md:px-2";

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

  const accountLine = `${BANK_LABEL[transaction.bankId]} · ${transaction.maskedAccount}${transaction.memo ? ` · ${transaction.memo}` : ""}`;

  return (
    <div
      className={cn(
        "group grid w-full grid-cols-1 border-b border-border/40 transition-colors duration-200",
        RECON_ROW_OUTER,
        "md:items-stretch"
      )}
    >
      {/* Bank — pure white; subtle hover */}
      <div
        className={cn(
          "flex flex-col gap-2 py-2 pl-1 pr-2 md:bg-white md:py-1.5 dark:md:bg-background",
          "md:transition-colors md:duration-200 md:group-hover:bg-muted/[0.06]"
        )}
      >
        <div className={cn("flex min-w-0 flex-col gap-2", RECON_BANK_INNER)}>
          <div className="font-mono text-[12px] tabular-nums tracking-tight text-muted-foreground md:pt-0.5">
            {formatReconciliationDate(transaction.date)}
          </div>

          <div className="min-w-0 md:min-w-0">
            <div className="flex items-start gap-2">
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
              </div>
            </div>
          </div>

          <p
            className="font-mono text-[10px] leading-snug tracking-tight text-muted-foreground md:text-right md:tabular-nums"
            title={accountLine}
          >
            <span className="md:line-clamp-3 md:break-all">{accountLine}</span>
          </p>

          <div className="text-left md:text-right">
            <p className={cashflowAmountClass(bankOutflow)}>{bankSigned}</p>
          </div>
        </div>
      </div>

      {/* Factora + action — tinted pane, divide from bank */}
      <div
        className={cn(
          "flex min-w-0 flex-col border-border/40 py-2 pl-1 pr-1 md:border-l md:border-border/60 md:bg-slate-50/90 md:py-1.5 md:pl-2 md:pr-0 md:shadow-[-4px_0_12px_rgba(0,0,0,0.02)] dark:md:bg-slate-900/30",
          "md:transition-colors md:duration-200 md:group-hover:bg-slate-100/95 dark:md:group-hover:bg-slate-900/45"
        )}
      >
        <div className={cn("flex min-w-0 flex-col gap-2", RECON_BOOK_INNER)}>
          <div className="flex min-w-0 items-start gap-2 md:min-w-0">
            <div
              className={cn(
                "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-white text-muted-foreground dark:bg-background"
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
              <p className="mt-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                Due {formatReconciliationDate(invoice.dueDate)}
              </p>
            </div>
          </div>

          <p
            className="min-w-0 font-mono text-[11px] leading-snug tracking-tight text-foreground/90 md:pt-0.5"
            title={invoice.glAccount}
          >
            <span className="md:line-clamp-3 md:break-words">
              {invoice.glAccount}
            </span>
          </p>

          <div className="text-left md:text-right md:pt-0.5">
            <p className={cashflowAmountClass(bankOutflow)}>{bookSigned}</p>
          </div>
        </div>
      </div>

      {/* Action — same tint as book for one continuous ledger strip */}
      <div
        className={cn(
          "flex items-center justify-end gap-1.5 border-border/40 py-2 pr-1 md:border-l md:border-border/50 md:bg-slate-50/90 md:py-1.5 md:pr-2 dark:md:bg-slate-900/30",
          "md:transition-colors md:duration-200 md:group-hover:bg-slate-100/95 dark:md:group-hover:bg-slate-900/45"
        )}
      >
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
