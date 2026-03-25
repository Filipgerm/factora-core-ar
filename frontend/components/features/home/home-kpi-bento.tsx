"use client";

import { useMemo } from "react";

import type { HomeKpiMetric } from "@/lib/views/home";

import { HomeKpiBentoCard } from "./home-kpi-bento-card";

const ARR_METRIC_ID = "kpi-arr";
const OAR_METRIC_ID = "kpi-oar";

interface HomeKpiBentoProps {
  metrics: HomeKpiMetric[];
}

export function HomeKpiBento({ metrics }: HomeKpiBentoProps) {
  const { arrMetric, oarMetric, compactMetrics } = useMemo(() => {
    const arr = metrics.find((m) => m.id === ARR_METRIC_ID);
    const oar = metrics.find((m) => m.id === OAR_METRIC_ID);
    const compact = metrics.filter(
      (m) => m.id !== ARR_METRIC_ID && m.id !== OAR_METRIC_ID
    );
    return { arrMetric: arr, oarMetric: oar, compactMetrics: compact };
  }, [metrics]);

  if (metrics.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/50 bg-muted/5 p-8 text-center">
        <p className="text-sm tracking-tight text-muted-foreground">
          No KPI data to display.
        </p>
      </div>
    );
  }

  if (!arrMetric || !oarMetric) {
    return (
      <div className="grid grid-cols-12 gap-3 sm:gap-4 lg:gap-5">
        {metrics.map((m, i) => (
          <div
            key={m.id}
            className="col-span-6 sm:col-span-4 lg:col-span-2 xl:col-span-2"
          >
            <HomeKpiBentoCard
              metric={m}
              index={i}
              variant={m.tier === "primary" ? "primary" : "compact"}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch lg:gap-4"
      data-testid="dashboard-kpi-bento"
    >
      <div className="lg:col-span-5">
        <HomeKpiBentoCard metric={arrMetric} index={0} variant="primary" />
      </div>
      <div className="lg:col-span-5">
        <HomeKpiBentoCard metric={oarMetric} index={1} variant="primary" />
      </div>
      <div className="flex min-h-0 flex-col gap-2 lg:col-span-2 lg:min-h-[188px]">
        {compactMetrics.map((m, i) => (
          <HomeKpiBentoCard
            key={m.id}
            metric={m}
            index={i + 2}
            variant="compact"
          />
        ))}
      </div>
    </div>
  );
}
