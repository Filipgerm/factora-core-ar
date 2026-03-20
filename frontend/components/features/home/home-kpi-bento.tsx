"use client";

import type { HomeKpiMetric } from "@/lib/mock-data/dashboard-mocks";
import { mockHomeKpiMetrics } from "@/lib/mock-data/dashboard-mocks";

import { HomeKpiBentoCard } from "./home-kpi-bento-card";

interface HomeKpiBentoProps {
  metrics?: HomeKpiMetric[];
}

export function HomeKpiBento({ metrics = mockHomeKpiMetrics }: HomeKpiBentoProps) {
  if (metrics.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/50 bg-muted/5 p-8 text-center">
        <p className="text-sm tracking-tight text-muted-foreground">
          No KPI data to display.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-3 lg:gap-4">
      {metrics.map((m, i) => (
        <HomeKpiBentoCard key={m.id} metric={m} index={i} />
      ))}
    </div>
  );
}
