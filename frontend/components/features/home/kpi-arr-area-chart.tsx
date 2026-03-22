"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { HomeKpiSparkPoint } from "@/lib/views/home";
import { cn } from "@/lib/utils";

interface KpiArrAreaChartProps {
  data: HomeKpiSparkPoint[];
  trendPositive: boolean;
  className?: string;
}

export function KpiArrAreaChart({
  data,
  trendPositive,
  className,
}: KpiArrAreaChartProps) {
  const chartData = data.map((d) => ({ x: d.i, v: d.v }));
  const stroke = trendPositive ? "#2f9a8a" : "#dc2626";
  const fillTone = trendPositive ? "#2f9a8a" : "#dc2626";
  const fillId = "arrAreaFill";

  return (
    <div className={cn("h-full min-h-[100px] w-full lg:min-h-[120px]", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillTone} stopOpacity={0.4} />
              <stop offset="50%" stopColor={fillTone} stopOpacity={0.12} />
              <stop offset="100%" stopColor={fillTone} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="x" hide />
          <YAxis domain={["dataMin - 0.15", "dataMax + 0.15"]} hide />
          <Tooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeOpacity: 0.4 }}
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <div className="rounded-lg border border-border/40 bg-background/90 px-2.5 py-1.5 text-xs shadow-sm backdrop-blur-md">
                  <span className="tabular-nums tracking-tight text-foreground">
                    €{Number(payload[0].value).toFixed(2)}M
                  </span>
                </div>
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#${fillId})`}
            fillOpacity={1}
            dot={false}
            isAnimationActive
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
