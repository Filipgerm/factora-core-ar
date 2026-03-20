"use client";

import { motion } from "framer-motion";

import { AnimatedMetricValue } from "@/components/features/home/animated-metric-value";
import { KpiArrAreaChart } from "@/components/features/home/kpi-arr-area-chart";
import type { HomeKpiMetric } from "@/lib/mock-data/dashboard-mocks";
import { cn } from "@/lib/utils";

const SNAP_SPRING = { type: "spring" as const, stiffness: 640, damping: 44 };

function formatDelta(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

interface HomeKpiBentoCardProps {
  metric: HomeKpiMetric;
  index: number;
  variant: "arr" | "standard";
}

export function HomeKpiBentoCard({
  metric,
  index,
  variant,
}: HomeKpiBentoCardProps) {
  const positive = metric.changePercent >= 0;
  const isArr = variant === "arr";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        ...SNAP_SPRING,
        delay: 0.04 + index * 0.04,
      }}
      whileHover={{ y: -1 }}
      className={cn(
        "h-full rounded-2xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-14px_rgba(15,23,42,0.08)] transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(15,23,42,0.06)]",
        isArr ? "p-6 lg:p-8" : "p-6"
      )}
    >
      {isArr ? (
        <div className="flex h-full min-h-[140px] flex-col gap-5 lg:min-h-[160px] lg:flex-row lg:items-center lg:gap-6">
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {metric.title}
            </h3>
            {metric.asOfLabel ? (
              <p className="mt-1 text-xs tracking-tight text-muted-foreground">
                {metric.asOfLabel}
              </p>
            ) : null}
            <AnimatedMetricValue
              target={metric.animateTarget}
              formatKey={metric.formatKey}
              className="mt-3 block text-3xl font-semibold tracking-tight text-foreground md:text-4xl lg:text-[2.75rem] lg:leading-tight"
            />
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0">
              <span
                className={cn(
                  "text-sm font-medium tabular-nums tracking-tight",
                  positive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {formatDelta(metric.changePercent)}
              </span>
              <span className="text-xs tracking-tight text-muted-foreground">
                {metric.comparisonLabel}
              </span>
            </div>
          </div>
          <div className="h-[112px] w-full shrink-0 lg:h-[132px] lg:w-[45%] lg:max-w-[220px]">
            <KpiArrAreaChart
              data={metric.sparkline}
              trendPositive={positive}
              className="h-full"
            />
          </div>
        </div>
      ) : (
        <div className="flex h-full min-h-[128px] flex-col">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {metric.title}
          </h3>
          {metric.asOfLabel ? (
            <p className="mt-1 line-clamp-2 text-xs tracking-tight text-muted-foreground">
              {metric.asOfLabel}
            </p>
          ) : null}
          <div className="mt-auto pt-4">
            <AnimatedMetricValue
              target={metric.animateTarget}
              formatKey={metric.formatKey}
              className="block text-2xl font-semibold tracking-tight text-foreground md:text-3xl"
            />
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0">
              <span
                className={cn(
                  "text-xs font-medium tabular-nums tracking-tight",
                  positive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {formatDelta(metric.changePercent)}
              </span>
              <span className="text-[11px] tracking-tight text-muted-foreground">
                {metric.comparisonLabel}
              </span>
            </div>
          </div>
        </div>
      )}
    </motion.article>
  );
}
