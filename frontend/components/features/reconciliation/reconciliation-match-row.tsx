"use client";

import {
  Bot,
  Briefcase,
  Check,
  CheckCircle2,
  CircleArrowDown,
  CircleArrowUp,
  HelpCircle,
  Landmark,
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

/** 50/50 Bank | Factora */
export const RECON_ROW_OUTER =
  "md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]";

/** All cells vertically centered with row content. */
export const RECON_BANK_INNER =
  "md:grid md:grid-cols-[2.85rem_minmax(0,1fr)_minmax(4.75rem,5.5rem)_3.35rem] md:gap-x-2 md:items-center md:px-2 md:py-1";

export const RECON_BOOK_INNER =
  "md:grid md:grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_3.1rem_minmax(3.85rem,4.65rem)] md:gap-x-1.5 md:items-center md:px-2 md:py-1";

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
    "font-mono text-[10px] tabular-nums tracking-tight",
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

  const accountShort = `${BANK_LABEL[transaction.bankId]} ${transaction.maskedAccount}`;
  const aiTier = isPending ? aiConfidenceTier(pair.aiConfidencePercent) : null;

  const bankPaneClass =
    "md:bg-[var(--brand-primary-subtle)] md:shadow-[inset_0_0_0_1px_rgba(47,154,138,0.12)] dark:md:bg-teal-950/25 dark:md:shadow-[inset_0_0_0_1px_rgba(45,212,191,0.18)]";

  const aiChipShell =
    "group/ai relative z-0 h-7 w-full max-w-[4.65rem] shrink-0 overflow-hidden rounded-md border shadow-sm transition-shadow duration-200 hover:shadow focus-within:shadow";

  return (
    <div
      className={cn(
        "group grid w-full grid-cols-1 border-b border-border/40 transition-colors duration-200",
        RECON_ROW_OUTER,
        "md:items-stretch"
      )}
    >
      <div
        className={cn(
          "py-1 pl-1 pr-2 md:py-0",
          bankPaneClass,
          "md:transition-colors md:duration-200 md:group-hover:bg-[var(--brand-primary-muted)]/45 dark:md:group-hover:bg-teal-950/40"
        )}
      >
        <div className={cn("min-w-0", RECON_BANK_INNER)}>
          <div className="flex items-center justify-start font-mono text-[9px] tabular-nums leading-none text-muted-foreground">
            {formatReconciliationDate(transaction.date)}
          </div>

          <div className="flex min-w-0 items-center gap-1.5">
            <div
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-md transition-colors duration-200",
                BANK_ACCENT[transaction.bankId]
              )}
              aria-hidden
            >
              <Landmark className="size-2.5" />
            </div>
            <div className="flex min-w-0 flex-col justify-center gap-0.5 py-0.5">
              <p className="truncate text-[10px] font-semibold leading-tight tracking-tight text-foreground">
                {transaction.merchant}
              </p>
              <p
                className="line-clamp-1 font-mono text-[9px] leading-tight tracking-tight text-muted-foreground"
                title={transaction.rawDescriptor}
              >
                {payerDisplayLine(transaction)}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-center px-0.5">
            <p
              className="w-full truncate text-center font-mono text-[9px] tabular-nums leading-tight text-muted-foreground"
              title={accountShort}
            >
              {accountShort}
            </p>
          </div>

          <div className="flex items-center justify-end">
            <p className={cashflowAmountClass(bankOutflow)}>{bankSigned}</p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "min-w-0 py-1 pl-1 pr-2 md:border-l md:border-border/60 md:bg-slate-50/90 md:py-0 md:pl-2 md:shadow-[-4px_0_12px_rgba(0,0,0,0.02)] dark:md:bg-slate-900/30",
          "md:transition-colors md:duration-200 md:group-hover:bg-slate-100/95 dark:md:group-hover:bg-slate-900/45"
        )}
      >
        <div className={cn("min-w-0", RECON_BOOK_INNER)}>
          <div
            className="flex items-center justify-center"
            title={invoice.invoiceCategory}
          >
            <span className="flex size-5 items-center justify-center rounded border border-border/50 bg-white text-muted-foreground dark:bg-background">
              <InvoiceCategoryIcon category={invoice.invoiceCategory} />
            </span>
          </div>

          <div className="flex min-w-0 items-center">
            <div className="flex min-w-0 flex-col justify-center gap-0.5 py-0.5">
              <p className="truncate text-[10px] font-semibold leading-tight text-foreground">
                {invoice.counterpartyName}
              </p>
              <p className="font-mono text-[8px] leading-tight text-muted-foreground">
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
                    invoice.status === "Overdue" &&
                      "text-amber-800 dark:text-amber-200"
                  )}
                >
                  {invoice.status}
                </span>
              </p>
              <p className="font-mono text-[8px] tabular-nums text-muted-foreground">
                Due {formatReconciliationDate(invoice.dueDate)}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-center">
            <p
              className="line-clamp-2 w-full font-mono text-[8px] leading-snug tracking-tight text-foreground/90"
              title={invoice.glAccount}
            >
              {invoice.glAccount}
            </p>
          </div>

          <div className="flex items-center justify-end">
            <p className={cashflowAmountClass(bankOutflow)}>{bookSigned}</p>
          </div>

          <div className="flex min-w-0 items-center justify-center">
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
                  <span className="inline-flex min-w-0 items-center gap-0.5 truncate text-[8px] font-semibold tabular-nums text-emerald-900 dark:text-emerald-100">
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
                      "min-w-0 truncate text-[9px] font-bold leading-none tracking-tight",
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
