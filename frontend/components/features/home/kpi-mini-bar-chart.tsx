"use client";

import { useId, useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { expandSparklineForChart } from "@/lib/dashboard/sparkline-display";
import type { HomeKpiSparkPoint } from "@/lib/views/home";
import { cn } from "@/lib/utils";

const TEAL = { r: 47, g: 154, b: 138 };
const RED = { r: 220, g: 38, b: 38 };

function formatTooltipEuro(v: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

interface KpiMiniBarChartProps {
  data: HomeKpiSparkPoint[];
  trendPositive: boolean;
  className?: string;
}

export function KpiMiniBarChart({
  data,
  trendPositive,
  className,
}: KpiMiniBarChartProps) {
  const uid = useId().replace(/:/g, "");
  const chartData = useMemo(() => {
    const expanded = expandSparklineForChart(data);
    return expanded.map((d, idx) => ({ name: `p${idx}`, v: d.v }));
  }, [data]);

  const vals = chartData.map((d) => d.v);
  const maxV = Math.max(...vals, 1);
  const minV = Math.min(...vals, 0);
  const base = trendPositive ? TEAL : RED;

  return (
    <div className={cn("h-full min-h-[100px] w-full lg:min-h-[120px]", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 6, right: 2, left: 0, bottom: 0 }}>
          <XAxis dataKey="name" type="category" hide />
          <YAxis domain={[minV * 0.95, maxV * 1.08]} hide />
          <Tooltip
            cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <div className="rounded-lg border border-border/40 bg-background/90 px-2.5 py-1.5 text-xs shadow-sm backdrop-blur-md">
                  <span className="tabular-nums tracking-tight text-foreground">
                    {formatTooltipEuro(Number(payload[0].value))}
                  </span>
                </div>
              ) : null
            }
          />
          <Bar dataKey="v" radius={[3, 3, 0, 0]} maxBarSize={10} isAnimationActive animationDuration={800}>
            {chartData.map((entry) => {
              const t = (entry.v - minV) / (maxV - minV || 1);
              const alpha = 0.35 + t * 0.45;
              return (
                <Cell
                  key={`${uid}-bar-${entry.name}`}
                  fill={`rgba(${base.r}, ${base.g}, ${base.b}, ${alpha})`}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
