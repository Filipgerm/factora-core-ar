"use client";

import { Landmark } from "lucide-react";

import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";
import { ReportPageShell } from "@/components/features/reporting/report-page-shell";

export function CashFlowReport() {
  return (
    <ReportPageShell
      title="Cash flow statement"
      subtitle="Operating, investing, and financing cash movements."
      exportFileStem="cash-flow-statement"
    >
      <FeatureEmptyState
        icon={Landmark}
        title="Cash flow API pending"
        description="Structured cash flow lines will load here once linked to ledger and banking cash movements."
        ctaHref="/reporting/income-statement"
        ctaLabel="Income statement (P&amp;L)"
      />
    </ReportPageShell>
  );
}
