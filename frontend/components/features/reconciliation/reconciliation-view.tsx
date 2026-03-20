"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";

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
    <LayoutGroup>
      <div className="space-y-6 lg:space-y-8">
        <motion.div
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-muted/10 p-6 shadow-sm md:p-8 dark:to-muted/5"
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
          <TabsList className="h-auto w-full flex-wrap gap-1 rounded-xl border border-border/40 bg-muted/30 p-1.5 shadow-sm backdrop-blur-sm">
            <TabsTrigger
              value="review"
              className="rounded-lg px-4 py-2 text-sm tracking-tight transition-all duration-300 ease-out data-[state=active]:border-border/30 data-[state=active]:bg-background/80 data-[state=active]:shadow-sm"
            >
              Needs review
              <span className="ml-2 rounded-md bg-amber-100/90 px-2 py-0.5 text-xs font-medium tabular-nums tracking-tight text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                {pendingVisible.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="auto"
              className="rounded-lg px-4 py-2 text-sm tracking-tight transition-all duration-300 ease-out data-[state=active]:border-border/30 data-[state=active]:bg-background/80 data-[state=active]:shadow-sm"
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
                <div className="mb-4 hidden grid-cols-2 gap-0 border-b border-border/40 pb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
                  <div className="pl-1">Bank transactions</div>
                  <div className="pl-4">Invoices · AR / AP</div>
                </div>
                <ul className="flex flex-col gap-3">
                  <AnimatePresence initial={false} mode="popLayout">
                    {pendingVisible.map((pair) => (
                      <motion.li
                        key={pair.id}
                        layout
                        initial={{ opacity: 0, y: 8, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -12, transition: { duration: 0.28 } }}
                        transition={{
                          duration: 0.38,
                          ease: [0.16, 1, 0.3, 1],
                          layout: { duration: 0.35 },
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
                <div className="mb-4 hidden grid-cols-2 gap-0 border-b border-border/40 pb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
                  <div className="pl-1">Bank transactions</div>
                  <div className="pl-4">Invoices · AR / AP</div>
                </div>
                <ul className="flex flex-col gap-3">
                  {mockReconciliationAutoMatchedPairs.map((pair, i) => (
                    <motion.li
                      key={pair.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: Math.min(i * 0.04, 0.2),
                        duration: 0.38,
                        ease: [0.16, 1, 0.3, 1],
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
