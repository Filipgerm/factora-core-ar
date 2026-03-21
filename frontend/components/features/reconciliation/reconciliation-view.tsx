"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { CircleDot, Sparkles } from "lucide-react";

import { MatchDetailSheet } from "@/components/features/reconciliation/match-detail-sheet";
import { ReconciliationEmptyState } from "@/components/features/reconciliation/reconciliation-empty-state";
import {
  RECON_BANK_INNER,
  RECON_BOOK_INNER,
  RECON_ROW_OUTER,
  ReconciliationMatchRow,
} from "@/components/features/reconciliation/reconciliation-match-row";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ReconciliationBankId,
  ReconciliationPendingPair,
} from "@/lib/mock-data/dashboard-mocks";
import {
  mockReconciliationAutoMatchedPairs,
  mockReconciliationPendingPairs,
} from "@/lib/mock-data/dashboard-mocks";
import { cn } from "@/lib/utils";

const HIGH_CONFIDENCE_THRESHOLD = 80;

const LEDGER_TH =
  "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground";

type MainTab = "action" | "matched";

type ConfidenceFilter = "all" | "high" | "medium" | "none";

const BANK_ACCOUNT_OPTIONS: { value: "all" | ReconciliationBankId; label: string }[] =
  [
    { value: "all", label: "All bank accounts" },
    { value: "eurobank", label: "Eurobank" },
    { value: "revolut", label: "Revolut" },
    { value: "n26", label: "N26" },
    { value: "deutschebank", label: "Deutsche Bank" },
    { value: "piraeus", label: "Piraeus Bank" },
  ];

function matchesConfidence(
  pct: number,
  filter: ConfidenceFilter
): boolean {
  if (filter === "all") return true;
  if (filter === "high") return pct >= HIGH_CONFIDENCE_THRESHOLD;
  if (filter === "medium")
    return pct >= 50 && pct < HIGH_CONFIDENCE_THRESHOLD;
  return pct < 50;
}

function matchesAccount<T extends { transaction: { bankId: ReconciliationBankId } }>(
  pair: T,
  account: "all" | ReconciliationBankId
): boolean {
  if (account === "all") return true;
  return pair.transaction.bankId === account;
}

export function ReconciliationView() {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activePair, setActivePair] = useState<ReconciliationPendingPair | null>(
    null
  );
  const [mainTab, setMainTab] = useState<MainTab>("action");
  const [accountFilter, setAccountFilter] = useState<"all" | ReconciliationBankId>(
    "all"
  );
  const [confidenceFilter, setConfidenceFilter] =
    useState<ConfidenceFilter>("all");

  const pendingVisible = useMemo(
    () =>
      mockReconciliationPendingPairs.filter((p) => !dismissedIds.has(p.id)),
    [dismissedIds]
  );

  const pendingFiltered = useMemo(
    () =>
      pendingVisible.filter(
        (p) =>
          matchesAccount(p, accountFilter) &&
          matchesConfidence(p.aiConfidencePercent, confidenceFilter)
      ),
    [pendingVisible, accountFilter, confidenceFilter]
  );

  const matchedFiltered = useMemo(
    () =>
      mockReconciliationAutoMatchedPairs.filter((p) =>
        matchesAccount(p, accountFilter)
      ),
    [accountFilter]
  );

  const highConfidencePending = useMemo(
    () =>
      pendingVisible.filter(
        (p) => p.aiConfidencePercent >= HIGH_CONFIDENCE_THRESHOLD
      ),
    [pendingVisible]
  );

  const dismissPair = useCallback((pairId: string) => {
    setDismissedIds((prev) => new Set(prev).add(pairId));
    setSheetOpen(false);
    setActivePair(null);
  }, []);

  const bulkConfirmHighConfidence = useCallback(() => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      highConfidencePending.forEach((p) => next.add(p.id));
      return next;
    });
    setSheetOpen(false);
    setActivePair(null);
  }, [highConfidencePending]);

  const handleConfirmMatch = useCallback(
    (pairId: string) => dismissPair(pairId),
    [dismissPair]
  );

  const handleRejectMatch = useCallback(
    (pairId: string) => dismissPair(pairId),
    [dismissPair]
  );

  const openPair = useCallback((pair: ReconciliationPendingPair) => {
    setActivePair(pair);
    setSheetOpen(true);
  }, []);

  const onSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setActivePair(null);
  }, []);

  const confidencePills: {
    id: ConfidenceFilter;
    label: string;
    icon?: ReactNode;
    className?: string;
  }[] = [
    { id: "all", label: "All" },
    {
      id: "high",
      label: "High",
      icon: <Sparkles className="size-3 text-violet-600 dark:text-violet-400" />,
    },
    {
      id: "medium",
      label: "Medium",
      icon: (
        <CircleDot className="size-3 text-amber-600 dark:text-amber-400" />
      ),
    },
    {
      id: "none",
      label: "No suggestion",
      className: "text-muted-foreground",
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar + domain + column headers: one frozen stack (toggle order unchanged). */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 shadow-[0_1px_0_rgba(0,0,0,0.03)] backdrop-blur-md supports-[backdrop-filter]:bg-slate-50/90 dark:border-slate-700/80 dark:bg-slate-950/90">
        <div className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <Select
              value={accountFilter}
              onValueChange={(v) =>
                setAccountFilter(v as "all" | ReconciliationBankId)
              }
            >
              <SelectTrigger
                size="sm"
                className="h-8 w-[min(100%,11.5rem)] rounded-lg border-border/70 text-[12px] font-medium shadow-none"
              >
                <SelectValue placeholder="Accounts" />
              </SelectTrigger>
              <SelectContent>
                {BANK_ACCOUNT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/20 p-0.5">
              <button
                type="button"
                onClick={() => setMainTab("action")}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium tabular-nums transition-all duration-200",
                  mainTab === "action"
                    ? "bg-rose-500/12 text-rose-900 shadow-sm dark:bg-rose-950/40 dark:text-rose-100"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Action needed ({pendingVisible.length})
              </button>
              <button
                type="button"
                onClick={() => setMainTab("matched")}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium tabular-nums transition-all duration-200",
                  mainTab === "matched"
                    ? "bg-emerald-500/12 text-emerald-900 shadow-sm dark:bg-emerald-950/40 dark:text-emerald-100"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Matched ({mockReconciliationAutoMatchedPairs.length})
              </button>
            </div>

            <div className="flex min-h-7 min-w-[min(100%,13.5rem)] shrink-0 items-center justify-start">
              {mainTab === "action" && highConfidencePending.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => bulkConfirmHighConfidence()}
                >
                  Confirm all high ({highConfidencePending.length})
                </Button>
              ) : (
                <span
                  className="pointer-events-none invisible inline-flex h-7 items-center whitespace-nowrap px-2 text-[11px] font-medium"
                  aria-hidden
                >
                  Confirm all high (00)
                </span>
              )}
            </div>
          </div>

          <div
            className={cn(
              "flex flex-wrap items-center gap-1 transition-opacity duration-200",
              mainTab === "matched" && "pointer-events-none opacity-40"
            )}
            title={
              mainTab === "matched"
                ? "AI confidence filters apply to the action queue only"
                : undefined
            }
          >
            <span className="mr-1 hidden text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:inline">
              AI
            </span>
            {confidencePills.map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setConfidenceFilter(pill.id)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums transition-all duration-200",
                  confidenceFilter === pill.id
                    ? "border-primary/35 bg-primary/10 text-foreground shadow-sm"
                    : "border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  pill.className
                )}
              >
                {pill.icon}
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Domain strip — 50/50; AI lives inside Factora */}
        <div
          className={cn(
            "hidden border-t border-slate-200/80 md:grid dark:border-slate-700/80",
            RECON_ROW_OUTER
          )}
        >
          <div
            className={cn(
              LEDGER_TH,
              "bg-[#E9EBEF] px-2 py-1.5 dark:bg-slate-800/90"
            )}
          >
            Bank
          </div>
          <div
            className={cn(
              LEDGER_TH,
              "border-l border-slate-200/80 bg-slate-50 py-1.5 pl-2 dark:border-slate-700/80 dark:bg-slate-950/40"
            )}
          >
            Factora
          </div>
        </div>

        {/* Column headers — Bank inner + Factora inner (Type … AI) */}
        <div
          className={cn(
            "hidden border-t border-slate-200/80 md:grid dark:border-slate-700/80",
            RECON_ROW_OUTER
          )}
        >
          <div
            className={cn(
              RECON_BANK_INNER,
              "bg-slate-50 dark:bg-slate-950/40"
            )}
          >
            <span
              className={cn(
                LEDGER_TH,
                "flex items-center justify-center text-center"
              )}
            >
              Date
            </span>
            <span
              className={cn(
                LEDGER_TH,
                "flex items-center justify-center text-center"
              )}
            >
              Payer
            </span>
            <span
              className={cn(
                LEDGER_TH,
                "flex items-center justify-center text-center"
              )}
            >
              Account
            </span>
            <span
              className={cn(
                LEDGER_TH,
                "flex items-center justify-center text-center"
              )}
            >
              Amount
            </span>
          </div>
          <div
            className={cn(
              RECON_BOOK_INNER,
              "border-l border-slate-200/80 bg-slate-50 dark:border-slate-700/80 dark:bg-slate-950/40"
            )}
          >
            <span
              className={cn(
                LEDGER_TH,
                "flex items-center justify-center text-center leading-tight"
              )}
            >
              Type
            </span>
            <span
              className={cn(
                LEDGER_TH,
                "flex items-center justify-center text-center leading-tight"
              )}
            >
              Vendor / Customer / Other
            </span>
            <span
              className={cn(
                LEDGER_TH,
                "flex items-center justify-center text-center leading-tight"
              )}
            >
              GL Account
            </span>
            <span
              className={cn(
                LEDGER_TH,
                "flex items-center justify-center text-center leading-tight"
              )}
            >
              Amount
            </span>
            <span
              className={cn(
                LEDGER_TH,
                "flex items-center justify-center text-center leading-tight"
              )}
            >
              AI
            </span>
          </div>
        </div>
      </div>

      {mainTab === "action" ? (
        pendingFiltered.length === 0 ? (
          <ReconciliationEmptyState
            title="Nothing in this view"
            description="Adjust bank account or AI filters, or wait for new suggested matches from the reconciliation agent."
          />
        ) : (
          <ul className="flex min-w-0 flex-col" role="list">
            {pendingFiltered.map((pair) => (
              <li key={pair.id} className="min-w-0">
                <ReconciliationMatchRow
                  variant="pending"
                  pair={pair}
                  onConfirm={handleConfirmMatch}
                  onReview={openPair}
                />
              </li>
            ))}
          </ul>
        )
      ) : matchedFiltered.length === 0 ? (
        <ReconciliationEmptyState
          title="No rows for this filter"
          description="Try widening the AI confidence filter or choosing all bank accounts."
        />
      ) : (
        <ul className="flex min-w-0 flex-col" role="list">
          {matchedFiltered.map((pair) => (
            <li key={pair.id} className="min-w-0">
              <ReconciliationMatchRow variant="auto" pair={pair} />
            </li>
          ))}
        </ul>
      )}

      <MatchDetailSheet
        open={sheetOpen}
        onOpenChange={onSheetOpenChange}
        pair={activePair}
        onConfirmMatch={handleConfirmMatch}
        onRejectMatch={handleRejectMatch}
      />
    </div>
  );
}
