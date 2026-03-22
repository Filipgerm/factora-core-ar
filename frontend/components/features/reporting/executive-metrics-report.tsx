"use client";

import { TrendingUp } from "lucide-react";

import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";
import { ReportPageShell } from "@/components/features/reporting/report-page-shell";

export function ExecutiveMetricsReport() {
  return (
    <ReportPageShell
      title="SaaS metrics"
      subtitle="Subscription economics and efficiency indicators."
      exportFileStem="executive-saas-metrics"
    >
      <FeatureEmptyState
        icon={TrendingUp}
        title="Executive metrics API pending"
        description="NRR, CAC payback, and other SaaS KPIs will populate when analytics pipelines are connected."
        ctaHref="/reporting/income-statement"
        ctaLabel="Income statement (P&amp;L)"
      />
    </ReportPageShell>
  );
}
