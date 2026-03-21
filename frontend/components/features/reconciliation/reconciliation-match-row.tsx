"use client";

import {
  Bot,
  Briefcase,
  Check,
  CheckCircle2,
  CircleArrowDown,
  CircleArrowUp,
  HelpCircle,
  Pencil,
  Receipt,
  Repeat,
  Train,
  Truck,
} from "lucide-react";

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
const MEDIUM_CONFIDENCE_THRESHOLD = 50;

function aiConfidenceTier(
  pct: number
): "high" | "medium" | "none" {
  if (pct >= HIGH_CONFIDENCE_THRESHOLD) return "high";
  if (pct >= MEDIUM_CONFIDENCE_THRESHOLD) return "medium";
  return "none";
}

/** Slightly lighter than #E9EBEF for bank pane + type icon wells. */
export const RECON_BANK_TINT_CLASS =
  "bg-[#EFF1F4] dark:bg-slate-800/90";

/** 50/50 Bank | Factora */
export const RECON_ROW_OUTER =
  "md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]";

/** Bank pane: consistent start positions per column; wider gaps for readability. */
export const RECON_BANK_INNER =
  "md:grid md:grid-cols-[3.35rem_minmax(0,1fr)_minmax(6.25rem,8.5rem)_minmax(5.25rem,6rem)] md:items-center md:gap-x-3 md:px-3 md:py-3";

/** Factora pane: extra space before AI; aligned with headers. */
export const RECON_BOOK_INNER =
  "md:grid md:grid-cols-[2.5rem_minmax(0,1.15fr)_minmax(0,1fr)_minmax(5.75rem,6.75rem)_minmax(6rem,6.75rem)] md:items-center md:gap-x-3 md:px-3 md:py-3";

export type ReconciliationRowMeta = {
  isFirst: boolean;
  isLast: boolean;
};

const BANK_LABEL: Record<ReconciliationBankId, string> = {
  eurobank: "Eurobank",
  revolut: "Revolut",
  n26: "N26",
  deutschebank: "Deutsche Bank",
  piraeus: "Piraeus Bank",
};

function payerHintLine(t: ReconciliationBankTransaction): string {
  const h = t.payerHint.replace(/\s+/g, " ").trim();
  if (h.length > 0) return h;
  const raw = t.rawDescriptor.replace(/\s+/g, " ").trim();
  if (raw.length <= 24) return raw;
  return `${raw.slice(0, 22)}…`;
}

function InvoiceCategoryIcon({
  category,
  className,
}: {
  category: ReconciliationInvoiceCategory;
  className?: string;
}) {
  const c = cn("size-3 shrink-0", className);
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
    "min-w-0 max-w-full font-mono text-[12px] tabular-nums tracking-tight",
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

function tierLabel(tier: "high" | "medium" | "none"): string {
  if (tier === "high") return "High";
  if (tier === "medium") return "Medium";
  return "No sugg.";
}

type ReconciliationMatchRowProps =
  | {
      variant: "pending";
      pair: ReconciliationPendingPair;
      onConfirm: (pairId: string) => void;
      onReview: (pair: ReconciliationPendingPair) => void;
      rowMeta?: ReconciliationRowMeta;
    }
  | {
      variant: "auto";
      pair: ReconciliationAutoMatchedPair;
      rowMeta?: ReconciliationRowMeta;
    };

export function ReconciliationMatchRow(props: ReconciliationMatchRowProps) {
  const { pair, variant, rowMeta } = props;
  const isFirstRow = rowMeta?.isFirst ?? false;
  const isLastRow = rowMeta?.isLast ?? false;
  const { transaction, invoice } = pair;
  const isPending = variant === "pending";
  const bankOutflow = transaction.amount < 0;
  const bankAbs = formatReconciliationEUR(Math.abs(transaction.amount));
  const bankSigned = bankOutflow ? `−${bankAbs}` : `+${bankAbs}`;
  const bookSigned = formatSignedLedgerAmount(
    invoice.totalAmount,
    bankOutflow
  );

  const accountShort = `${BANK_LABEL[transaction.bankId]} ${transaction.maskedAccount}`;
  const aiTier = isPending ? aiConfidenceTier(pair.aiConfidencePercent) : null;

  const bankPaneClass = "md:bg-[#EFF1F4] dark:md:bg-slate-800/90";

  const aiChipShell =
    "group/ai relative z-0 h-7 w-full max-w-[5.35rem] shrink-0 overflow-hidden rounded-md border shadow-sm transition-shadow duration-200 hover:shadow focus-within:shadow";

  return (
    <div
      className={cn(
        "group grid w-full grid-cols-1 border-b border-slate-200 transition-colors duration-200 dark:border-slate-700/80",
        RECON_ROW_OUTER,
        "md:items-stretch"
      )}
    >
      <div
        className={cn(
          "py-2.5 pl-1 pr-2 md:py-0",
          bankPaneClass,
          "md:transition-colors md:duration-200 md:group-hover:bg-[#e8eaef] dark:md:group-hover:bg-slate-800",
          isFirstRow && "md:rounded-tl-xl",
          isLastRow && "md:rounded-bl-xl"
        )}
      >
        <div className={cn("min-w-0", RECON_BANK_INNER)}>
          <div className="flex min-w-0 items-center justify-end">
            <p className="w-full min-w-0 truncate text-right font-mono text-[11px] font-semibold tabular-nums leading-none text-muted-foreground">
              {formatReconciliationDate(transaction.date)}
            </p>
          </div>

          <div
            className="flex min-w-0 flex-col justify-center gap-0.5"
            title={`${transaction.merchant} · ${payerHintLine(transaction)}`}
          >
            <p className="w-full min-w-0 truncate text-left text-[12px] font-semibold leading-tight tracking-tight text-[var(--brand-primary)] dark:text-teal-400">
              {transaction.merchant}
            </p>
            <p
              className="w-full min-w-0 truncate text-left text-[10px] font-semibold leading-tight tracking-wide text-muted-foreground"
              title={transaction.rawDescriptor}
            >
              {payerHintLine(transaction)}
            </p>
          </div>

          <div className="flex min-w-0 items-center justify-start">
            <p
              className="w-full min-w-0 truncate text-left font-mono text-[11px] font-semibold tabular-nums leading-none text-muted-foreground"
              title={accountShort}
            >
              {accountShort}
            </p>
          </div>

          <div className="flex min-w-0 items-center justify-end">
            <p className={cn(cashflowAmountClass(bankOutflow), "truncate text-right")}>
              {bankSigned}
            </p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "min-w-0 py-2.5 pl-1 pr-2 md:border-l md:border-slate-200/80 md:bg-slate-50 md:py-0 md:pl-3 md:pr-3 dark:md:border-slate-700/80 dark:md:bg-slate-950/35",
          "md:transition-colors md:duration-200 md:group-hover:bg-slate-100/90 dark:md:group-hover:bg-slate-900/45"
        )}
      >
        <div className={cn("min-w-0", RECON_BOOK_INNER)}>
          <div
            className="flex items-center justify-center"
            title={invoice.invoiceCategory}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground",
                RECON_BANK_TINT_CLASS
              )}
            >
              <InvoiceCategoryIcon category={invoice.invoiceCategory} />
            </span>
          </div>

          <div
            className="flex min-w-0 flex-col justify-center gap-0.5"
            title={`${invoice.counterpartyName} · ${invoice.invoiceSummary}`}
          >
            <p className="w-full min-w-0 truncate text-left text-[12px] font-semibold leading-tight tracking-tight text-foreground">
              {invoice.counterpartyName}
            </p>
            <p
              className="w-full min-w-0 truncate text-left text-[10px] font-semibold leading-tight tracking-wide text-muted-foreground"
              title={invoice.invoiceSummary}
            >
              {invoice.invoiceSummary}
            </p>
          </div>

          <div className="flex min-w-0 items-center justify-start">
            <p
              className="w-full min-w-0 truncate text-left font-mono text-[11px] font-semibold leading-tight tracking-tight text-foreground/90"
              title={invoice.glAccount}
            >
              {invoice.glAccount}
            </p>
          </div>

          <div className="flex min-w-0 items-center justify-end pr-0.5">
            <p
              className={cn(
                cashflowAmountClass(bankOutflow),
                "truncate text-right"
              )}
            >
              {bookSigned}
            </p>
          </div>

          <div className="flex min-w-0 items-center justify-end pl-1">
            {variant === "auto" ? (
              <div
                className={cn(
                  aiChipShell,
                  "border-emerald-500/35 bg-emerald-500/12 dark:border-emerald-500/25"
                )}
              >
                <div className="flex h-full items-center justify-center gap-0.5 px-0.5">
                  <Bot
                    className="size-3 shrink-0 text-emerald-700 dark:text-emerald-300"
                    aria-hidden
                  />
                  <span className="inline-flex min-w-0 items-center gap-0.5 truncate text-[9px] font-semibold tabular-nums text-emerald-900 dark:text-emerald-100">
                    <CheckCircle2 className="size-2.5 shrink-0" aria-hidden />
                    Matched
                  </span>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  aiChipShell,
                  aiTier === "high" &&
                    "border-violet-400/40 bg-violet-500/15 dark:border-violet-500/30 dark:bg-violet-950/45",
                  aiTier === "medium" &&
                    "border-amber-400/45 bg-amber-500/18 dark:border-amber-500/35 dark:bg-amber-950/40",
                  aiTier === "none" &&
                    "border-border/70 bg-muted/75 dark:bg-muted/35"
                )}
                role="group"
                aria-label="AI suggestion and actions"
              >
                <div
                  className={cn(
                    "absolute inset-0 z-10 flex items-center gap-1 px-1 transition-all duration-200 ease-out",
                    "group-hover/ai:pointer-events-none group-hover/ai:scale-95 group-hover/ai:opacity-0",
                    "group-focus-within/ai:pointer-events-none group-focus-within/ai:scale-95 group-focus-within/ai:opacity-0"
                  )}
                >
                  <Bot
                    className={cn(
                      "size-3 shrink-0",
                      aiTier === "high" &&
                        "text-violet-700 dark:text-violet-300",
                      aiTier === "medium" &&
                        "text-amber-800 dark:text-amber-200",
                      aiTier === "none" && "text-muted-foreground"
                    )}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "min-w-0 truncate text-[10px] font-semibold leading-none tracking-tight",
                      aiTier === "high" &&
                        "text-violet-950 dark:text-violet-100",
                      aiTier === "medium" &&
                        "text-amber-950 dark:text-amber-50",
                      aiTier === "none" && "text-muted-foreground"
                    )}
                    title={
                      aiTier === "none" ? "No suggestion" : tierLabel(aiTier!)
                    }
                  >
                    {tierLabel(aiTier!)}
                  </span>
                </div>
                <div
                  className={cn(
                    "absolute inset-0 z-20 flex items-center justify-center gap-0.5 px-0.5 transition-all duration-200 ease-out",
                    "pointer-events-none scale-95 opacity-0",
                    "group-hover/ai:pointer-events-auto group-hover/ai:scale-100 group-hover/ai:opacity-100",
                    "group-focus-within/ai:pointer-events-auto group-focus-within/ai:scale-100 group-focus-within/ai:opacity-100"
                  )}
                >
                  <button
                    type="button"
                    title="Edit match"
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded border border-border/70 bg-white text-muted-foreground transition-colors duration-200",
                      "hover:bg-muted/60 hover:text-foreground",
                      "focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
                      "dark:bg-background"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      props.onReview(pair);
                    }}
                  >
                    <Pencil className="size-3" aria-hidden />
                    <span className="sr-only">Edit match</span>
                  </button>
                  <button
                    type="button"
                    title="Reconcile"
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded border border-emerald-500/40 bg-emerald-500/15 text-emerald-900 transition-colors duration-200",
                      "hover:bg-emerald-500/25",
                      "focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
                      "dark:text-emerald-100"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      props.onConfirm(pair.id);
                    }}
                  >
                    <Check className="size-3" aria-hidden />
                    <span className="sr-only">Reconcile</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
