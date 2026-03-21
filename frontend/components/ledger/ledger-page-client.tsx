"use client";

import { Suspense } from "react";

import { SmartLedgerView } from "@/components/ledger/smart-ledger-view";

function LedgerFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Loading ledger…
    </div>
  );
}

export function LedgerPageClient() {
  return (
    <Suspense fallback={<LedgerFallback />}>
      <SmartLedgerView />
    </Suspense>
  );
}
