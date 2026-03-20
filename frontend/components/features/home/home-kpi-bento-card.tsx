"use client";

import { motion } from "framer-motion";

import { AnimatedMetricValue } from "@/components/features/home/animated-metric-value";
import { KpiSparkline } from "@/components/features/home/kpi-sparkline";
import type { HomeKpiMetric } from "@/lib/mock-data/dashboard-mocks";
import { cn } from "@/lib/utils";

function formatDelta(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

interface HomeKpiBentoCardProps {
  metric: HomeKpiMetric;
  index: number;
}

export function HomeKpiBentoCard({ metric, index }: HomeKpiBentoCardProps) {
  const positive = metric.changePercent >= 0;
  const isPrimary = metric.tier === "primary";

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.08 + index * 0.06,
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ y: -2 }}
      className={cn(
        "flex h-full flex-col rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-muted/20 p-8 shadow-sm transition-shadow duration-300 hover:shadow-md dark:to-muted/10",
        isPrimary && "min-h-[220px] lg:min-h-[240px]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium tracking-tight text-muted-foreground">
            {metric.title}
          </h3>
          {metric.asOfLabel ? (
            <p className="mt-1 text-xs tracking-tight text-muted-foreground/80">
              {metric.asOfLabel}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-1 flex-col justify-between gap-4">
        <div>
          <AnimatedMetricValue
            target={metric.animateTarget}
            formatKey={metric.formatKey}
            className={cn(
              "block font-semibold tracking-tight text-foreground",
              isPrimary ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl"
            )}
          />
          <div className="mt-3 flex flex-wrap items-baseline gap-2">
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
        <KpiSparkline
          data={metric.sparkline}
          trendPositive={positive}
          className={cn(isPrimary ? "h-14" : "h-12")}
        />
      </div>
    </motion.article>
  );
}
