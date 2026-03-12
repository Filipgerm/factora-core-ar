"use client";

import { PLKpiSkeleton } from "./pl-kpi-skeleton";
import { PLChartsSkeleton } from "./pl-charts-skeleton";
import { PLTableSkeleton } from "./pl-table-skeleton";

export function PLContentSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PLKpiSkeleton />
      <PLChartsSkeleton />
      <PLTableSkeleton />
    </div>
  );
}

