"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { HomeKpiSparkPoint } from "@/lib/mock-data/dashboard-mocks";
import { cn } from "@/lib/utils";

export function ReportMiniAreaChart({
  data,
  trendPositive,
  formatTooltip,
  className,
}: {
  data: HomeKpiSparkPoint[];
  trendPositive: boolean;
  formatTooltip: (value: number) => string;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const chartData = data.map((d) => ({ x: d.i, v: d.v }));
  const stroke = trendPositive ? "#2f9a8a" : "#dc2626";
  const fillTone = trendPositive ? "#2f9a8a" : "#dc2626";
  const fillId = `reportSpark-${uid}`;

  return (
    <div className={cn("h-full min-h-[72px] w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 6, right: 2, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillTone} stopOpacity={0.35} />
              <stop offset="100%" stopColor={fillTone} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="x" hide />
          <YAxis domain={["dataMin - 0.12", "dataMax + 0.12"]} hide />
          <Tooltip
            cursor={{
              stroke: "var(--border)",
              strokeWidth: 1,
              strokeOpacity: 0.35,
            }}
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <div className="rounded-md border border-border/50 bg-background/95 px-2 py-1 text-[11px] shadow-sm">
                  <span className="tabular-nums text-foreground">
                    {formatTooltip(Number(payload[0].value))}
                  </span>
                </div>
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke={stroke}
            strokeWidth={1.75}
            fill={`url(#${fillId})`}
            fillOpacity={1}
            dot={false}
            isAnimationActive
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
