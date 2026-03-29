"use client";

import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { expandSparklineForChart } from "@/lib/dashboard/sparkline-display";
import type { HomeKpiSparkPoint } from "@/lib/views/home";
import { cn } from "@/lib/utils";

function formatTooltipEuro(v: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

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
  const uid = useId().replace(/:/g, "");
  const fillId = `kpi-area-fill-${uid}`;

  const chartData = useMemo(() => {
    const expanded = expandSparklineForChart(data);
    return expanded.map((d) => ({ x: d.i, v: d.v }));
  }, [data]);

  const domain = useMemo(() => {
    const vals = chartData.map((d) => d.v);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min;
    const pad =
      span < 1e-9 ? Math.max(Math.abs(max) * 0.08, 1) : Math.max(span * 0.14, 1);
    return [min - pad, max + pad] as [number, number];
  }, [chartData]);

  const stroke = trendPositive ? "#2f9a8a" : "#dc2626";
  const fillTop = trendPositive ? "#2f9a8a" : "#dc2626";

  return (
    <div className={cn("h-full min-h-[100px] w-full lg:min-h-[120px]", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillTop} stopOpacity={0.4} />
              <stop offset="50%" stopColor={fillTop} stopOpacity={0.12} />
              <stop offset="100%" stopColor={fillTop} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="x" hide />
          <YAxis domain={domain} hide />
          <Tooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeOpacity: 0.4 }}
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
