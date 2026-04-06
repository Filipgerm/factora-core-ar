"use client";

import { Card, Metric, Text } from "@tremor/react";

import {
  DASHBOARD_PL_DAYS_DEFAULT,
  useDashboardPlMetricsQuery,
} from "@/lib/hooks/api/use-dashboard";
import { useResolvedSaltEdgeCustomerId } from "@/lib/hooks/api/use-saltedge";
import { formatStatementEUR } from "@/lib/reporting/format-statement-eur";
import { Skeleton } from "@/components/ui/skeleton";

type ReportingPlFromDashboardProps = {
  /** Subtitle under the metric grid. */
  footnote?: string;
};

/**
 * Shared Tremor metrics from ``GET /v1/dashboard/pl-metrics`` for reporting pages
 * that do not yet have dedicated ledger endpoints.
 */
export function ReportingPlFromDashboard({
  footnote = `Figures from connected accounts for the last ${DASHBOARD_PL_DAYS_DEFAULT} days.`,
}: ReportingPlFromDashboardProps) {
  const { customerId } = useResolvedSaltEdgeCustomerId();
  const pl = useDashboardPlMetricsQuery(
    customerId
      ? { customerId, days: DASHBOARD_PL_DAYS_DEFAULT }
      : null
  );

  if (!customerId) {
    return (
      <Text className="text-sm text-muted-foreground">
        Connect banking under Integrations to load cash and P&amp;L-derived metrics.
      </Text>
    );
  }

  if (pl.isLoading || !pl.data) {
    return <Skeleton className="h-40 w-full rounded-xl" />;
  }

  const m = pl.data;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <Text>Total revenue</Text>
          <Metric>{formatStatementEUR(m.total_revenue)}</Metric>
        </Card>
        <Card>
          <Text>Total expenses</Text>
          <Metric>{formatStatementEUR(m.total_expenses)}</Metric>
        </Card>
        <Card>
          <Text>Net income</Text>
          <Metric>{formatStatementEUR(m.net_income)}</Metric>
        </Card>
        <Card>
          <Text>Net cash flow</Text>
          <Metric>{formatStatementEUR(m.net_cash_flow)}</Metric>
        </Card>
        <Card>
          <Text>Account balances (snapshot)</Text>
          <Metric>{formatStatementEUR(m.balance)}</Metric>
        </Card>
        <Card>
          <Text>Period</Text>
          <Metric className="text-lg tabular-nums">
            {m.period_days} days
          </Metric>
        </Card>
      </div>
      <Text className="text-xs text-muted-foreground">{footnote}</Text>
    </div>
  );
}
