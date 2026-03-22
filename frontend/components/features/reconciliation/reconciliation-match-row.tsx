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
} from "@/lib/views/reconciliation";
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

/** Midpoint between bank tint (#EFF1F4) and ledger pane (slate-50 ≈ #f8fafc) — full-row hover. */
const RECON_ROW_HOVER_PANE =
  "group-hover/reconrow:bg-[#F4F6F8] dark:group-hover/reconrow:bg-slate-800/78";

/** Type column icon well — aligns with sidebar teal treatment. */
export const RECON_TYPE_ICON_WELL =
  "border border-teal-200/45 bg-[var(--brand-primary-subtle)] shadow-[inset_0_0_0_1px_rgba(47,154,138,0.08)] dark:border-teal-800/45 dark:bg-teal-950/25";

/** 50/50 Bank | Factora */
export const RECON_ROW_OUTER =
  "md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]";

/** Bank pane: date column left-aligned with header; extra gap before payer. */
export const RECON_BANK_INNER =
  "md:grid md:grid-cols-[4.65rem_minmax(0,1fr)_minmax(6.25rem,8.5rem)_minmax(5.25rem,6rem)] md:items-center md:gap-x-5 md:px-3 md:py-3";

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

  const bankPaneClass = cn(
    "transition-colors duration-200 ease-out",
    "md:bg-[#EFF1F4] dark:md:bg-slate-800/90",
    RECON_ROW_HOVER_PANE
  );

  const aiChipBase =
    "relative z-0 flex h-7 min-w-[4.75rem] shrink-0 items-center gap-1 rounded-md border px-1.5 shadow-sm transition-shadow duration-200";

  return (
    <div
      className={cn(
        "group/reconrow grid w-full grid-cols-1 border-b border-slate-200 dark:border-slate-700/80",
        RECON_ROW_OUTER,
        "md:items-stretch"
      )}
    >
      <div
        className={cn(
          "py-2.5 pl-1 pr-2 md:py-0",
          bankPaneClass,
          isFirstRow && "md:rounded-tl-xl",
          isLastRow && "md:rounded-bl-xl"
        )}
      >
        <div className={cn("min-w-0", RECON_BANK_INNER)}>
          <div className="flex min-w-0 items-center justify-start">
            <p className="w-full min-w-0 whitespace-nowrap text-left font-mono text-[11px] font-semibold tabular-nums leading-none text-muted-foreground">
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
          "min-w-0 py-2.5 pl-1 pr-2 transition-colors duration-200 ease-out md:border-l md:border-slate-200/80 md:bg-slate-50 md:py-0 md:pl-3 md:pr-3 dark:md:border-slate-700/80 dark:md:bg-slate-950/35",
          RECON_ROW_HOVER_PANE
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
                RECON_TYPE_ICON_WELL
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

          <div className="flex min-w-0 flex-col items-end justify-center gap-1.5 pl-1 md:min-h-[2.25rem]">
            {variant === "auto" ? (
              <div
                className={cn(
                  aiChipBase,
                  "border-emerald-500/35 bg-emerald-500/12 dark:border-emerald-500/25"
                )}
              >
                <Bot
                  className="size-3 shrink-0 text-emerald-700 dark:text-emerald-300"
                  aria-hidden
                />
                <span className="inline-flex min-w-0 items-center gap-0.5 truncate text-[9px] font-semibold tabular-nums text-emerald-900 dark:text-emerald-100">
                  <CheckCircle2 className="size-2.5 shrink-0" aria-hidden />
                  Matched
                </span>
              </div>
            ) : (
              <div className="relative flex w-full min-w-0 flex-col items-end md:h-8 md:min-w-[5.75rem]">
                <div
                  className={cn(
                    "flex w-full justify-end transition-all duration-200 ease-out",
                    "md:absolute md:right-0 md:top-1/2 md:w-auto md:-translate-y-1/2",
                    "md:group-hover/reconrow:pointer-events-none md:group-hover/reconrow:scale-95 md:group-hover/reconrow:opacity-0",
                    "md:group-focus-within/reconrow:pointer-events-none md:group-focus-within/reconrow:scale-95 md:group-focus-within/reconrow:opacity-0"
                  )}
                >
                  <div
                    className={cn(
                      aiChipBase,
                      aiTier === "high" &&
                        "border-violet-400/40 bg-violet-500/15 dark:border-violet-500/30 dark:bg-violet-950/45",
                      aiTier === "medium" &&
                        "border-amber-400/45 bg-amber-500/18 dark:border-amber-500/35 dark:bg-amber-950/40",
                      aiTier === "none" &&
                        "border-border/70 bg-muted/75 dark:bg-muted/35"
                    )}
                    role="status"
                    aria-label={`AI suggestion: ${tierLabel(aiTier!)}`}
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
                    >
                      {tierLabel(aiTier!)}
                    </span>
                  </div>
                </div>
                <div
                  className={cn(
                    "flex w-full justify-end gap-0.5",
                    "md:absolute md:right-0 md:top-1/2 md:w-auto md:-translate-y-1/2",
                    "md:scale-95 md:opacity-0 md:pointer-events-none md:transition-all md:duration-200 md:ease-out",
                    "md:group-hover/reconrow:scale-100 md:group-hover/reconrow:opacity-100 md:group-hover/reconrow:pointer-events-auto",
                    "md:group-focus-within/reconrow:scale-100 md:group-focus-within/reconrow:opacity-100 md:group-focus-within/reconrow:pointer-events-auto"
                  )}
                >
                  <button
                    type="button"
                    title="Edit match"
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-md border border-border/70 bg-white text-muted-foreground shadow-sm transition-colors duration-200",
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
                    <Pencil className="size-3.5" aria-hidden />
                    <span className="sr-only">Edit match</span>
                  </button>
                  <button
                    type="button"
                    title="Reconcile"
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-md border border-emerald-500/40 bg-emerald-500/15 text-emerald-900 shadow-sm transition-colors duration-200",
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
                    <Check className="size-3.5" aria-hidden />
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
