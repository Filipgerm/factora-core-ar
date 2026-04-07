import { Suspense } from "react";

import { GeneralLedgerLayoutClient } from "@/components/features/general-ledger/ledger-view-context";

export default function GeneralLedgerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground transition-all duration-200">
          Loading ledger…
        </div>
      }
    >
      <GeneralLedgerLayoutClient>{children}</GeneralLedgerLayoutClient>
    </Suspense>
  );
}
