"use client";

import type { HomeKpiMetric } from "@/lib/mock-data/dashboard-mocks";
import { mockHomeKpiMetrics } from "@/lib/mock-data/dashboard-mocks";

import { HomeKpiBentoCard } from "./home-kpi-bento-card";

interface HomeKpiBentoProps {
  metrics?: HomeKpiMetric[];
}

export function HomeKpiBento({ metrics = mockHomeKpiMetrics }: HomeKpiBentoProps) {
  const primary = metrics.filter((m) => m.tier === "primary");
  const secondary = metrics.filter((m) => m.tier === "secondary");

  if (metrics.length === 0) {
    return (
      <div className="col-span-12 rounded-2xl border-2 border-dashed border-border/50 bg-muted/10 p-12 text-center">
        <p className="text-sm tracking-tight text-muted-foreground">
          No KPI data to display.
        </p>
      </div>
    );
  }

  return (
    <>
      {primary.map((m, i) => (
        <div key={m.id} className="col-span-12 md:col-span-6">
          <HomeKpiBentoCard metric={m} index={i} />
        </div>
      ))}
      {secondary.map((m, i) => (
        <div key={m.id} className="col-span-12 sm:col-span-6 lg:col-span-4">
          <HomeKpiBentoCard metric={m} index={i + primary.length} />
        </div>
      ))}
    </>
  );
}
