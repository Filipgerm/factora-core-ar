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

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.04 + index * 0.04,
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ y: -1 }}
      className={cn(
        "flex min-w-0 flex-col rounded-xl border border-border/40 bg-gradient-to-br from-card via-card to-muted/15 p-4 shadow-sm transition-shadow duration-200 hover:shadow-md dark:to-muted/10",
        "min-h-[132px] md:min-h-0"
      )}
    >
      <h3 className="text-xs font-medium tracking-tight text-muted-foreground">
        {metric.title}
      </h3>
      {metric.asOfLabel ? (
        <p className="mt-0.5 line-clamp-1 text-[10px] leading-tight tracking-tight text-muted-foreground/75">
          {metric.asOfLabel}
        </p>
      ) : null}

      <div className="mt-2 min-w-0 flex-1">
        <AnimatedMetricValue
          target={metric.animateTarget}
          formatKey={metric.formatKey}
          className="block truncate text-xl font-semibold tracking-tight text-foreground md:text-2xl"
        />
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
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
          <span className="text-[10px] tracking-tight text-muted-foreground">
            {metric.comparisonLabel}
          </span>
        </div>
      </div>
      <KpiSparkline
        data={metric.sparkline}
        trendPositive={positive}
        className="mt-2 h-7"
      />
    </motion.article>
  );
}
