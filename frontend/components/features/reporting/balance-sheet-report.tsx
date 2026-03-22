"use client";

import { Scale } from "lucide-react";

import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";
import { ReportPageShell } from "@/components/features/reporting/report-page-shell";

export function BalanceSheetReport() {
  return (
    <ReportPageShell
      title="Balance sheet"
      subtitle="Assets, liabilities, and equity as of reporting date."
      exportFileStem="balance-sheet"
    >
      <FeatureEmptyState
        icon={Scale}
        title="Balance sheet API pending"
        description="Trial balance and period-close positions will render here when the reporting service exposes balance sheet lines."
        ctaHref="/reporting/income-statement"
        ctaLabel="Income statement (P&amp;L)"
      />
    </ReportPageShell>
  );
}
