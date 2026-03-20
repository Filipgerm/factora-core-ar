"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { HomeKpiSparkPoint } from "@/lib/mock-data/dashboard-mocks";
import { cn } from "@/lib/utils";

interface KpiSparklineProps {
  data: HomeKpiSparkPoint[];
  /** When trend is up (positive change), stroke leans green; down leans red */
  trendPositive: boolean;
  className?: string;
}

export function KpiSparkline({
  data,
  trendPositive,
  className,
}: KpiSparklineProps) {
  const chartData = data.map((d) => ({ x: d.i, v: d.v }));
  const stroke = trendPositive
    ? "var(--summary-accent, #059669)"
    : "oklch(0.577 0.245 27.325)";

  return (
    <div className={cn("h-[52px] w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
        >
          <XAxis dataKey="x" hide />
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Tooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <div className="rounded-md border border-slate-200 bg-popover px-2 py-1 text-xs shadow-sm">
                  <span className="tabular-nums text-foreground">
                    {Number(payload[0].value).toLocaleString("el-GR", {
                      maximumFractionDigits: 1,
                    })}
                  </span>
                </div>
              ) : null
            }
          />
          <Line
            type="monotone"
            dataKey="v"
            stroke={stroke}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
