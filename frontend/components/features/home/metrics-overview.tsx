"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import type { HomeKpiMetric } from "@/lib/mock-data/dashboard-mocks";
import { mockHomeKpiMetrics } from "@/lib/mock-data/dashboard-mocks";
import { cn } from "@/lib/utils";

import { KpiSparkline } from "./kpi-sparkline";

function formatDelta(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

interface MetricsOverviewProps {
  metrics?: HomeKpiMetric[];
}

export function MetricsOverview({ metrics = mockHomeKpiMetrics }: MetricsOverviewProps) {
  if (metrics.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-200 bg-card/40 px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">No KPI data to display.</p>
      </div>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Key metrics
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => {
          const positive = m.changePercent >= 0;
          return (
            <Card
              key={m.id}
              className="border-slate-200 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:hover:border-slate-700"
            >
              <CardHeader className="space-y-0 pb-2">
                <CardDescription className="text-xs font-medium text-muted-foreground">
                  {m.title}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
                  {m.valueDisplay}
                </p>
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "text-sm font-medium tabular-nums",
                      positive
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {formatDelta(m.changePercent)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {m.comparisonLabel}
                  </span>
                </div>
                <KpiSparkline data={m.sparkline} trendPositive={positive} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
