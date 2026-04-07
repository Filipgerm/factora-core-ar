"use client";

import { Landmark } from "lucide-react";

import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";
import { ReportingPlFromDashboard } from "@/components/features/reporting/reporting-pl-from-dashboard";
import { ReportPageShell } from "@/components/features/reporting/report-page-shell";
import { useResolvedSaltEdgeCustomerId } from "@/lib/hooks/api/use-saltedge";

export function CashFlowReport() {
  const { customerId } = useResolvedSaltEdgeCustomerId();

  return (
    <ReportPageShell
      title="Cash flow statement"
      subtitle="Operating, investing, and financing cash movements."
      exportFileStem="cash-flow-statement"
    >
      {customerId ? (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Net cash flow below is the signed sum of posted bank activity (excluding
            internal transfers) for the reporting window. Detailed operating /
            investing / financing lines will replace this summary when the reporting
            service ships.
          </p>
          <ReportingPlFromDashboard />
        </div>
      ) : (
        <FeatureEmptyState
          icon={Landmark}
          title="Banking data required"
          description="Connect open banking to see net cash flow and balances for your organization."
          ctaHref="/integrations"
          ctaLabel="Open integrations"
        />
      )}
    </ReportPageShell>
  );
}
