"use client";

import { Scale } from "lucide-react";

import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";
import { ReportingPlFromDashboard } from "@/components/features/reporting/reporting-pl-from-dashboard";
import { ReportPageShell } from "@/components/features/reporting/report-page-shell";
import { useResolvedSaltEdgeCustomerId } from "@/lib/hooks/api/use-saltedge";

export function BalanceSheetReport() {
  const { customerId } = useResolvedSaltEdgeCustomerId();

  return (
    <ReportPageShell
      title="Balance sheet"
      subtitle="Assets, liabilities, and equity as of reporting date."
      exportFileStem="balance-sheet"
    >
      {customerId ? (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            The snapshot below aggregates EUR cash balances from connected accounts.
            Full assets, liabilities, and equity from the general ledger will appear
            here when the balance sheet API is available.
          </p>
          <ReportingPlFromDashboard footnote="Cash and cash equivalents snapshot — not yet a full IFRS balance sheet." />
        </div>
      ) : (
        <FeatureEmptyState
          icon={Scale}
          title="Banking data required"
          description="Connect open banking to see consolidated cash balances."
          ctaHref="/integrations"
          ctaLabel="Open integrations"
        />
      )}
    </ReportPageShell>
  );
}
