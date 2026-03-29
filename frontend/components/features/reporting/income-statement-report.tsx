"use client";

import { BarChart3 } from "lucide-react";

import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";
import { ReportPageShell } from "@/components/features/reporting/report-page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardPlMetricsQuery } from "@/lib/hooks/api/use-dashboard";
import { useResolvedSaltEdgeCustomerId } from "@/lib/hooks/api/use-saltedge";
import { formatStatementEUR } from "@/lib/reporting/format-statement-eur";
import type { DashboardMetricsResponse } from "@/lib/schemas/dashboard";
import { cn } from "@/lib/utils";

const CELL = "px-3 py-2.5 text-sm tabular-nums tracking-tight";
const TH = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground";

type PlRow =
  | { id: string; label: string; value: number; highlight?: boolean }
  | { id: string; label: string; valueLabel: string };

function buildPlRows(m: DashboardMetricsResponse): PlRow[] {
  const margin =
    m.average_margin != null ? `${(m.average_margin * 100).toFixed(1)}%` : "—";
  return [
    { id: "rev", label: "Total revenue", value: m.total_revenue },
    { id: "exp", label: "Total expenses", value: m.total_expenses },
    { id: "ni", label: "Net income", value: m.net_income, highlight: true },
    { id: "margin", label: "Average margin (period)", valueLabel: margin },
    { id: "cf", label: "Net cash flow", value: m.net_cash_flow },
    { id: "bal", label: "Balance (snapshot)", value: m.balance },
  ];
}

export function IncomeStatementReport() {
  const { customerId } = useResolvedSaltEdgeCustomerId();
  const pl = useDashboardPlMetricsQuery(
    customerId ? { customerId, days: 30 } : null
  );

  if (!customerId) {
    return (
      <ReportPageShell
        title="Income statement"
        subtitle="Profit and loss derived from connected banking P&amp;L metrics."
        exportFileStem="income-statement"
      >
        <FeatureEmptyState
          icon={BarChart3}
          title="Banking data required"
          description="Connect open banking and resolve a customer to load revenue, expenses, and net income for the selected period."
          ctaHref="/integrations"
          ctaLabel="Open integrations"
        />
      </ReportPageShell>
    );
  }

  if (pl.isLoading) {
    return (
      <ReportPageShell
        title="Income statement"
        subtitle="Loading P&amp;L metrics…"
        exportFileStem="income-statement"
      >
        <Skeleton className="h-[280px] w-full rounded-xl" />
      </ReportPageShell>
    );
  }

  if (!pl.data) {
    return (
      <ReportPageShell
        title="Income statement"
        subtitle="Could not load metrics."
        exportFileStem="income-statement"
      >
        <FeatureEmptyState
          icon={BarChart3}
          title="No data"
          description="Try again later or verify your banking connection."
          ctaHref="/integrations"
          ctaLabel="Integrations"
        />
      </ReportPageShell>
    );
  }

  const m = pl.data;
  const rows = buildPlRows(m);

  return (
    <ReportPageShell
      title="Income statement"
      subtitle={`Last ${m.period_days} days · ${m.currency}. Line detail from the general ledger is not available yet.`}
      exportFileStem="income-statement"
    >
      <div className="overflow-x-auto rounded-xl border border-slate-200/90 dark:border-slate-800">
        <table className="w-full min-w-[400px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
              <th className={TH}>Line</th>
              <th className={cn(TH, "text-right")}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-slate-100 last:border-b-0 dark:border-slate-800/80",
                  "value" in row && row.highlight
                    ? "bg-emerald-50/80 font-semibold dark:bg-emerald-950/25"
                    : "bg-white dark:bg-background"
                )}
              >
                <td className={cn(CELL, "text-foreground")}>{row.label}</td>
                <td className={cn(CELL, "text-right font-medium")}>
                  {"valueLabel" in row
                    ? row.valueLabel
                    : formatStatementEUR(row.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Source: <span className="font-medium text-foreground">GET /v1/dashboard/pl-metrics</span>.
        This is a management summary, not a full IFRS schedule —{" "}
        <span className="italic">TODO: Phase 3 Backend</span> for GL trial balance lines.
      </p>
    </ReportPageShell>
  );
}
