"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";

import { MatchDetailSheet } from "@/components/features/reconciliation/match-detail-sheet";
import { ReconciliationEmptyState } from "@/components/features/reconciliation/reconciliation-empty-state";
import { ReconciliationMatchRow } from "@/components/features/reconciliation/reconciliation-match-row";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReconciliationPendingPair } from "@/lib/mock-data/dashboard-mocks";
import {
  mockReconciliationAutoMatchedPairs,
  mockReconciliationPendingPairs,
} from "@/lib/mock-data/dashboard-mocks";

const HIGH_CONFIDENCE_THRESHOLD = 80;
const SNAP_SPRING = { type: "spring" as const, stiffness: 640, damping: 44 };

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

  return (
    <LayoutGroup>
      <div className="space-y-6 lg:space-y-8">
        <motion.div
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SNAP_SPRING}
          className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_14px_40px_-18px_rgba(15,23,42,0.1)] md:p-8"
        >
          <h2 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
            AI reconciliation
          </h2>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed tracking-tight text-muted-foreground md:text-sm">
            Bank transactions aligned with AR and AP invoices. Review
            low-confidence pairs, or browse auto-matched lines the agent already
            locked.
          </p>
        </motion.div>

        <Tabs defaultValue="review" className="gap-5">
          <TabsList className="h-auto w-full flex-wrap gap-1 rounded-xl border border-slate-100 bg-white p-1.5 shadow-sm">
            <TabsTrigger
              value="review"
              className="rounded-lg px-4 py-2 text-sm font-medium tracking-tight transition-all duration-200 data-[state=active]:bg-slate-50 data-[state=active]:shadow-sm"
            >
              Needs review
              <span className="ml-2 rounded-md bg-amber-100/90 px-2 py-0.5 text-xs font-medium tabular-nums tracking-tight text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                {pendingVisible.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="auto"
              className="rounded-lg px-4 py-2 text-sm font-medium tracking-tight transition-all duration-200 data-[state=active]:bg-slate-50 data-[state=active]:shadow-sm"
            >
              Auto-matched
              <span className="ml-2 rounded-md bg-emerald-100/90 px-2 py-0.5 text-xs font-medium tabular-nums tracking-tight text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
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
                {highConfidencePending.length > 0 ? (
                  <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-relaxed tracking-tight text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {highConfidencePending.length}
                      </span>{" "}
                      suggested match
                      {highConfidencePending.length === 1 ? "" : "es"} at{" "}
                      {HIGH_CONFIDENCE_THRESHOLD}%+ confidence — confirm in one
                      action for faster month-end close.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0 shadow-sm"
                      onClick={() => bulkConfirmHighConfidence()}
                    >
                      Bulk confirm high-confidence matches
                    </Button>
                  </div>
                ) : null}

                <div className="mb-3 hidden grid-cols-[1fr_2.75rem_1fr] gap-0 border-b border-slate-100 pb-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:grid">
                  <div className="pl-2">Bank feed</div>
                  <div className="text-center" aria-hidden>
                    ·
                  </div>
                  <div className="pl-1">Book · AR / AP</div>
                </div>
                <ul className="flex flex-col gap-3">
                  <AnimatePresence initial={false} mode="popLayout">
                    {pendingVisible.map((pair) => (
                      <motion.li
                        key={pair.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10, transition: { duration: 0.22 } }}
                        transition={{
                          ...SNAP_SPRING,
                          layout: { type: "spring", stiffness: 680, damping: 46 },
                        }}
                      >
                        <ReconciliationMatchRow
                          variant="pending"
                          pair={pair}
                          onSelect={openPair}
                        />
                      </motion.li>
                    ))}
                  </AnimatePresence>
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
                <div className="mb-3 hidden grid-cols-[1fr_2.75rem_1fr] gap-0 border-b border-slate-100 pb-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:grid">
                  <div className="pl-2">Bank feed</div>
                  <div className="text-center" aria-hidden>
                    ·
                  </div>
                  <div className="pl-1">Book · AR / AP</div>
                </div>
                <ul className="flex flex-col gap-3">
                  {mockReconciliationAutoMatchedPairs.map((pair, i) => (
                    <motion.li
                      key={pair.id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        ...SNAP_SPRING,
                        delay: Math.min(i * 0.025, 0.12),
                      }}
                    >
                      <ReconciliationMatchRow variant="auto" pair={pair} />
                    </motion.li>
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
    </LayoutGroup>
  );
}
