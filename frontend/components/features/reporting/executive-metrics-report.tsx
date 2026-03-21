"use client";

import { ReportPageShell } from "@/components/features/reporting/report-page-shell";
import { ReportMiniAreaChart } from "@/components/features/reporting/report-mini-area-chart";
import { EXECUTIVE_SAAS_METRICS } from "@/lib/mock-data/financial-statements-mocks";
import { cn } from "@/lib/utils";

export function ExecutiveMetricsReport() {
  return (
    <ReportPageShell
      title="SaaS metrics"
      subtitle="High-level subscription economics and efficiency indicators."
      exportFileStem="executive-saas-metrics"
    >
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EXECUTIVE_SAAS_METRICS.map((m) => (
          <li
            key={m.id}
            className={cn(
              "flex min-h-[112px] items-stretch justify-between gap-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-background"
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {m.name}
              </span>
              <span className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {m.valueDisplay}
              </span>
              {m.sublabel ? (
                <span className="mt-0.5 text-xs text-muted-foreground">{m.sublabel}</span>
              ) : null}
            </div>
            <div className="h-[72px] w-[120px] shrink-0 sm:w-[132px]">
              <ReportMiniAreaChart
                data={m.sparkline}
                trendPositive={m.trendPositive}
                formatTooltip={m.formatTooltip}
              />
            </div>
          </li>
        ))}
      </ul>
    </ReportPageShell>
  );
}
