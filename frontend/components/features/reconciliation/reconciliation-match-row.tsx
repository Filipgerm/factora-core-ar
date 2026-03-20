"use client";

import {
  Briefcase,
  CheckCircle2,
  CircleArrowDown,
  CircleArrowUp,
  HelpCircle,
  Landmark,
  Receipt,
  Repeat,
  Sparkles,
  Train,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  ReconciliationAutoMatchedPair,
  ReconciliationBankId,
  ReconciliationBankTransaction,
  ReconciliationInvoiceCategory,
  ReconciliationPendingPair,
} from "@/lib/mock-data/dashboard-mocks";
import { cn } from "@/lib/utils";

import {
  formatReconciliationDate,
  formatReconciliationEUR,
} from "./reconciliation-money";

const HIGH_CONFIDENCE_THRESHOLD = 80;

/** 50/50 Bank | Factora (Factora includes Type … AI in one pane). */
export const RECON_ROW_OUTER =
  "md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]";

/** Symmetric density: fixed rails + shared flex middle. */
export const RECON_BANK_INNER =
  "md:grid md:grid-cols-[3.25rem_minmax(0,1fr)_4.5rem_3.75rem] md:gap-x-1.5 md:items-start md:px-2";

/** Type | Vendor/Customer/Other | GL | Amount | AI — equal flex on text columns. */
export const RECON_BOOK_INNER =
  "md:grid md:grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)_3.75rem_minmax(4.5rem,5.5rem)] md:gap-x-1.5 md:items-start md:px-2";

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

const KIND_LABEL = {
  vendor: "Vendor",
  customer: "Customer",
  other: "Other",
} as const;

function payerDisplayLine(t: ReconciliationBankTransaction): string {
  if (t.displayDescriptor?.trim()) return t.displayDescriptor.trim();
  const raw = t.rawDescriptor.replace(/\s+/g, " ").trim();
  if (raw.length <= 56) return raw;
  return `${raw.slice(0, 54)}…`;
}

function InvoiceCategoryIcon({
  category,
  className,
}: {
  category: ReconciliationInvoiceCategory;
  className?: string;
}) {
  const c = cn("size-3.5 shrink-0", className);
  switch (category) {
    case "subscription":
      return <Repeat className={c} aria-hidden />;
    case "services":
      return <Briefcase className={c} aria-hidden />;
    case "travel":
      return <Train className={c} aria-hidden />;
    case "fee":
      return <Receipt className={c} aria-hidden />;
    case "receivable":
      return <CircleArrowUp className={c} aria-hidden />;
    case "payable":
      return <CircleArrowDown className={c} aria-hidden />;
    case "logistics":
      return <Truck className={c} aria-hidden />;
    default:
      return <HelpCircle className={c} aria-hidden />;
  }
}

function cashflowAmountClass(isOutflow: boolean) {
  return cn(
    "font-mono text-[11px] tabular-nums tracking-tight",
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

  const accountShort = `${BANK_LABEL[transaction.bankId]} ${transaction.maskedAccount}`;

  return (
    <div
      className={cn(
        "group grid w-full grid-cols-1 border-b border-border/40 transition-colors duration-200",
        RECON_ROW_OUTER,
        "md:items-stretch"
      )}
    >
      {/* Bank */}
      <div
        className={cn(
          "flex flex-col gap-2 py-2 pl-1 pr-2 md:bg-white md:py-1.5 dark:md:bg-background",
          "md:transition-colors md:duration-200 md:group-hover:bg-muted/[0.06]"
        )}
      >
        <div className={cn("flex min-w-0 flex-col gap-2", RECON_BANK_INNER)}>
          <div className="font-mono text-[10px] tabular-nums leading-none text-muted-foreground md:pt-1">
            {formatReconciliationDate(transaction.date)}
          </div>

          <div className="min-w-0">
            <div className="flex items-start gap-1.5">
              <div
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md transition-colors duration-200",
                  BANK_ACCENT[transaction.bankId]
                )}
                aria-hidden
              >
                <Landmark className="size-3" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold leading-tight tracking-tight text-foreground">
                  {transaction.merchant}
                </p>
                <p
                  className="mt-0.5 line-clamp-1 font-mono text-[8px] leading-tight tracking-tight text-muted-foreground"
                  title={transaction.rawDescriptor}
                >
                  {payerDisplayLine(transaction)}
                </p>
              </div>
            </div>
          </div>

          <p
            className="truncate font-mono text-[8px] tabular-nums text-muted-foreground md:text-right"
            title={accountShort}
          >
            {accountShort}
          </p>

          <div className="text-left md:text-right md:pt-0.5">
            <p className={cashflowAmountClass(bankOutflow)}>{bankSigned}</p>
          </div>
        </div>
      </div>

      {/* Factora — Type, Vendor/Customer/Other, GL, Amount, AI (single ledger pane) */}
      <div
        className={cn(
          "flex min-w-0 flex-col border-border/40 py-2 pl-1 pr-2 md:border-l md:border-border/60 md:bg-slate-50/90 md:py-1.5 md:pl-2 md:shadow-[-4px_0_12px_rgba(0,0,0,0.02)] dark:md:bg-slate-900/30",
          "md:transition-colors md:duration-200 md:group-hover:bg-slate-100/95 dark:md:group-hover:bg-slate-900/45"
        )}
      >
        <div className={cn("flex min-w-0 flex-col gap-2", RECON_BOOK_INNER)}>
          <div
            className="flex items-center justify-center pt-0.5 md:pt-1"
            title={invoice.invoiceCategory}
          >
            <span className="flex size-6 items-center justify-center rounded-md border border-border/50 bg-white text-muted-foreground dark:bg-background">
              <InvoiceCategoryIcon category={invoice.invoiceCategory} />
            </span>
          </div>

          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold leading-tight text-foreground">
              {invoice.counterpartyName}
            </p>
            <p className="mt-0.5 font-mono text-[8px] leading-tight text-muted-foreground">
              <span className="font-medium text-foreground/80">
                {KIND_LABEL[invoice.counterpartyKind]}
              </span>
              <span className="text-muted-foreground/80"> · </span>
              <span>{invoice.invoiceNumber}</span>
              <span className="text-muted-foreground/80"> · </span>
              <span>{invoice.role}</span>
              <span className="text-muted-foreground/80"> · </span>
              <span
                className={cn(
                  invoice.status === "Overdue" && "text-amber-800 dark:text-amber-200"
                )}
              >
                {invoice.status}
              </span>
            </p>
            <p className="mt-0.5 font-mono text-[8px] tabular-nums text-muted-foreground">
              Due {formatReconciliationDate(invoice.dueDate)}
            </p>
          </div>

          <p
            className="line-clamp-2 min-w-0 font-mono text-[9px] leading-snug tracking-tight text-foreground/90 md:pt-0.5"
            title={invoice.glAccount}
          >
            {invoice.glAccount}
          </p>

          <div className="text-left md:text-right md:pt-0.5">
            <p className={cashflowAmountClass(bankOutflow)}>{bookSigned}</p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1 md:min-h-[1.75rem] md:pt-0.5">
            {variant === "auto" ? (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium tabular-nums text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="size-2.5 shrink-0" aria-hidden />
                Matched
              </span>
            ) : isHighConfidence ? (
              <Button
                type="button"
                size="sm"
                className="h-6 gap-0.5 bg-primary/12 px-2 text-[10px] font-medium text-primary shadow-none hover:bg-primary/18 dark:bg-primary/20 dark:hover:bg-primary/28"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  props.onConfirm(pair.id);
                }}
              >
                <Sparkles className="size-2.5" aria-hidden />
                Confirm
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 border-border/70 px-2 text-[10px] font-medium shadow-none"
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
      </div>
    </div>
  );
}
