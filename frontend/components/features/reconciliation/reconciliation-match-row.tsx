"use client";

import {
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

/** 50/50 Bank | Factora (Factora includes Type … AI in one pane). */
export const RECON_ROW_OUTER =
  "md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]";

/** Wider gap + room before amount column vs account. */
export const RECON_BANK_INNER =
  "md:grid md:grid-cols-[3.25rem_minmax(0,1fr)_minmax(5.5rem,6.25rem)_3.75rem] md:gap-x-3 md:items-start md:px-2";

/** Type | Vendor/Customer/Other | GL | Amount | AI (centered stack). */
export const RECON_BOOK_INNER =
  "md:grid md:grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)_3.5rem_4.5rem] md:gap-x-1.5 md:items-start md:px-2";

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

  const accountShort = `${BANK_LABEL[transaction.bankId]} ${transaction.maskedAccount}`;
  const aiTier = isPending ? aiConfidenceTier(pair.aiConfidencePercent) : null;

  const bankPaneClass =
    "md:bg-[var(--brand-primary-subtle)] md:shadow-[inset_0_0_0_1px_rgba(47,154,138,0.12)] dark:md:bg-teal-950/25 dark:md:shadow-[inset_0_0_0_1px_rgba(45,212,191,0.18)]";

  return (
    <div
      className={cn(
        "group grid w-full grid-cols-1 border-b border-border/40 transition-colors duration-200",
        RECON_ROW_OUTER,
        "md:items-stretch"
      )}
    >
      {/* Bank — Factora teal rail (matches active sidebar item) */}
      <div
        className={cn(
          "flex flex-col gap-2 py-2 pl-1 pr-2 md:py-1.5",
          bankPaneClass,
          "md:transition-colors md:duration-200 md:group-hover:bg-[var(--brand-primary-muted)]/45 dark:md:group-hover:bg-teal-950/40"
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
                  className="mt-0.5 line-clamp-1 font-mono text-[10px] leading-snug tracking-tight text-muted-foreground"
                  title={transaction.rawDescriptor}
                >
                  {payerDisplayLine(transaction)}
                </p>
              </div>
            </div>
          </div>

          <p
            className="truncate font-mono text-[10px] tabular-nums leading-snug text-muted-foreground md:text-right"
            title={accountShort}
          >
            {accountShort}
          </p>

          <div className="text-left md:pl-1 md:text-right md:pt-0.5">
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

          <div className="group/ai relative flex w-full flex-col items-center gap-1.5 md:min-h-[2.25rem] md:pt-0.5">
            {variant === "auto" ? (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium tabular-nums text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="size-3 shrink-0" aria-hidden />
                Matched
              </span>
            ) : (
              <>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-center text-[10px] font-semibold tracking-tight",
                    aiTier === "high" &&
                      "bg-violet-500/12 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200",
                    aiTier === "medium" &&
                      "bg-amber-500/12 text-amber-950 dark:bg-amber-950/35 dark:text-amber-100",
                    aiTier === "none" &&
                      "bg-muted/80 text-muted-foreground"
                  )}
                >
                  {aiTier === "high"
                    ? "High"
                    : aiTier === "medium"
                      ? "Medium"
                      : "No suggestion"}
                </span>
                <div
                  className="flex items-center justify-center gap-0.5 opacity-0 transition-opacity duration-200 pointer-events-none group-hover/ai:pointer-events-auto group-hover/ai:opacity-100"
                  role="group"
                  aria-label="Match actions"
                >
                  <button
                    type="button"
                    title="Edit match"
                    className={cn(
                      "flex size-7 items-center justify-center rounded-md border border-border/60 bg-white text-muted-foreground transition-colors duration-200",
                      "hover:border-border hover:bg-muted/40 hover:text-foreground",
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
                      "flex size-7 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 transition-colors duration-200",
                      "hover:bg-emerald-500/20 hover:text-emerald-950",
                      "focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
                      "dark:text-emerald-200 dark:hover:bg-emerald-950/50"
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
