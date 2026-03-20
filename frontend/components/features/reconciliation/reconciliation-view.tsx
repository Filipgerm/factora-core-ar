"use client";

import { useCallback, useMemo, useState } from "react";

import { MatchDetailSheet } from "@/components/features/reconciliation/match-detail-sheet";
import { ReconciliationEmptyState } from "@/components/features/reconciliation/reconciliation-empty-state";
import { ReconciliationMatchRow } from "@/components/features/reconciliation/reconciliation-match-row";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReconciliationPendingPair } from "@/lib/mock-data/dashboard-mocks";
import {
  mockReconciliationAutoMatchedPairs,
  mockReconciliationPendingPairs,
} from "@/lib/mock-data/dashboard-mocks";

export function ReconciliationView() {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activePair, setActivePair] = useState<ReconciliationPendingPair | null>(
    null
  );

  const pendingVisible = useMemo(
    () =>
      mockReconciliationPendingPairs.filter((p) => !dismissedIds.has(p.id)),
    [dismissedIds]
  );

  const dismissPair = useCallback((pairId: string) => {
    setDismissedIds((prev) => new Set(prev).add(pairId));
    setSheetOpen(false);
    setActivePair(null);
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 border-l-4 border-l-[var(--brand-primary)] bg-card p-5 shadow-sm transition-all duration-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          AI reconciliation
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Bank transactions aligned with AR and AP invoices. Review
          low-confidence pairs, or browse auto-matched lines the agent already
          locked.
        </p>
      </div>

      <Tabs defaultValue="review" className="gap-4">
        <TabsList className="h-auto flex-wrap gap-1 bg-muted/80 p-1">
          <TabsTrigger
            value="review"
            className="transition-all duration-200 data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            Needs review
            <span className="ml-1.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-medium tabular-nums text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
              {pendingVisible.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="auto"
            className="transition-all duration-200 data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            Auto-matched
            <span className="ml-1.5 rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-medium tabular-nums text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
              {mockReconciliationAutoMatchedPairs.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="mt-0 outline-none">
          {pendingVisible.length === 0 ? (
            <ReconciliationEmptyState
              title="Queue cleared"
              description="No pending AI matches. New bank lines will appear here when the reconciliation agent proposes a link that needs your confirmation."
            />
          ) : (
            <>
              <div className="mb-3 hidden grid-cols-2 gap-0 border-b border-slate-200 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
                <div className="pl-3">Bank transactions</div>
                <div className="pl-4">Invoices · AR / AP</div>
              </div>
              <ul className="flex flex-col gap-3">
                {pendingVisible.map((pair) => (
                  <li key={pair.id}>
                    <ReconciliationMatchRow
                      variant="pending"
                      pair={pair}
                      onSelect={openPair}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </TabsContent>

        <TabsContent value="auto" className="mt-0 outline-none">
          {mockReconciliationAutoMatchedPairs.length === 0 ? (
            <ReconciliationEmptyState
              title="No auto-matches yet"
              description="When the agent posts high-confidence matches, they will show here with a green linked treatment."
            />
          ) : (
            <>
              <div className="mb-3 hidden grid-cols-2 gap-0 border-b border-slate-200 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
                <div className="pl-3">Bank transactions</div>
                <div className="pl-4">Invoices · AR / AP</div>
              </div>
              <ul className="flex flex-col gap-3">
                {mockReconciliationAutoMatchedPairs.map((pair) => (
                  <li key={pair.id}>
                    <ReconciliationMatchRow variant="auto" pair={pair} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </TabsContent>
      </Tabs>

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
