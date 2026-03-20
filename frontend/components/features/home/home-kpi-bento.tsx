"use client";

import { useMemo } from "react";

import type { HomeKpiMetric } from "@/lib/mock-data/dashboard-mocks";
import { mockHomeKpiMetrics } from "@/lib/mock-data/dashboard-mocks";

import { HomeKpiBentoCard } from "./home-kpi-bento-card";

const ARR_METRIC_ID = "kpi-arr";

interface HomeKpiBentoProps {
  metrics?: HomeKpiMetric[];
}

export function HomeKpiBento({ metrics = mockHomeKpiMetrics }: HomeKpiBentoProps) {
  const { arrMetric, otherMetrics } = useMemo(() => {
    const arr = metrics.find((m) => m.id === ARR_METRIC_ID);
    const rest = metrics.filter((m) => m.id !== ARR_METRIC_ID);
    return { arrMetric: arr, otherMetrics: rest };
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

  if (!arrMetric) {
    return (
      <div className="grid grid-cols-12 gap-3 sm:gap-4 lg:gap-5">
        {metrics.map((m, i) => (
          <div
            key={m.id}
            className="col-span-6 sm:col-span-4 lg:col-span-2 xl:col-span-2"
          >
            <HomeKpiBentoCard metric={m} index={i} variant="standard" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-3 sm:gap-4 lg:gap-5">
      <div className="col-span-12 lg:col-span-4">
        <HomeKpiBentoCard metric={arrMetric} index={0} variant="arr" />
      </div>
      {otherMetrics.map((m, i) => (
        <div key={m.id} className="col-span-6 md:col-span-3 lg:col-span-2">
          <HomeKpiBentoCard
            metric={m}
            index={i + 1}
            variant="standard"
          />
        </div>
      ))}
    </div>
  );
}
