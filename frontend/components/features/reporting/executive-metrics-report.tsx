"use client";

import { TrendingUp } from "lucide-react";

import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";
import { ReportingPlFromDashboard } from "@/components/features/reporting/reporting-pl-from-dashboard";
import { ReportPageShell } from "@/components/features/reporting/report-page-shell";
import { useResolvedSaltEdgeCustomerId } from "@/lib/hooks/api/use-saltedge";

export function ExecutiveMetricsReport() {
  const { customerId } = useResolvedSaltEdgeCustomerId();

  return (
    <ReportPageShell
      title="SaaS metrics"
      subtitle="Subscription economics and efficiency indicators."
      exportFileStem="executive-saas-metrics"
    >
      {customerId ? (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Placeholder executive view: revenue, margin proxy (net income), cash
            generation, and liquidity from banking until NRR and CAC analytics
            pipelines are wired.
          </p>
          <ReportingPlFromDashboard footnote="Derived from banking P&amp;L metrics — not yet NRR / CAC / LTV." />
        </div>
      ) : (
        <FeatureEmptyState
          icon={TrendingUp}
          title="Banking data required"
          description="Connect open banking to see revenue and profitability trends for your tenant."
          ctaHref="/integrations"
          ctaLabel="Open integrations"
        />
      )}
    </ReportPageShell>
  );
}
