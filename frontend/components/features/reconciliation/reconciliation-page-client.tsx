"use client";

import { Suspense } from "react";

import { ReconciliationView } from "@/components/features/reconciliation/reconciliation-view";

function ReconciliationViewFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Loading reconciliation…
    </div>
  );
}

export function ReconciliationPageClient() {
  return (
    <Suspense fallback={<ReconciliationViewFallback />}>
      <ReconciliationView />
    </Suspense>
  );
}
