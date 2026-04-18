"use client";

import { useId, useMemo } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";

export interface RevenueWaterfallPoint {
  month: string;
  recognized: number;
  deferredClosing: number;
}

export interface WaterfallSeriesLabels {
  primary: string;
  closing: string;
}

const DEFAULT_LABELS: WaterfallSeriesLabels = {
  primary: "Recognized",
  closing: "Deferred (closing)",
};

interface RevenueWaterfallChartProps {
  data: RevenueWaterfallPoint[];
  currency: string;
  className?: string;
  seriesLabels?: WaterfallSeriesLabels;
}

function formatAxisCurrency(value: number, currency: string): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  if (abs >= 1_000) {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatFullCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMonthTick(raw: string): string {
  if (!raw || raw.length < 7) return raw;
  const [year, month] = raw.slice(0, 7).split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString("en-IE", { month: "short" }).toUpperCase();
}

export function RevenueWaterfallChart({
  data,
  currency,
  className,
  seriesLabels = DEFAULT_LABELS,
}: RevenueWaterfallChartProps) {
  const uid = useId().replace(/:/g, "");
  const areaGradientId = `waterfall-area-${uid}`;
  const barGradientId = `waterfall-bar-${uid}`;

  const domain = useMemo<[number, number]>(() => {
    if (data.length === 0) return [0, 1];
    const vals = data.flatMap((d) => [d.recognized, d.deferredClosing]);
    const max = Math.max(...vals, 0);
    return [0, Math.max(max * 1.12, 1)];
  }, [data]);

  return (
    <div className={cn("h-[260px] w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
          barCategoryGap="32%"
        >
          <defs>
            <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2f9a8a" stopOpacity={0.22} />
              <stop offset="55%" stopColor="#2f9a8a" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#2f9a8a" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={barGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2f9a8a" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#2f9a8a" stopOpacity={0.55} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="2 4"
            stroke="rgb(148 163 184 / 0.28)"
            vertical={false}
          />

          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tick={{
              fill: "rgb(100 116 139 / 0.95)",
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: 0.6,
            }}
            tickFormatter={formatMonthTick}
            interval="preserveStartEnd"
            minTickGap={18}
          />
          <YAxis
            domain={domain}
            width={56}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            tick={{
              fill: "rgb(100 116 139 / 0.9)",
              fontSize: 10,
              fontWeight: 500,
            }}
            tickFormatter={(v: number) => formatAxisCurrency(v, currency)}
          />

          <Tooltip
            cursor={{
              fill: "rgb(47 154 138 / 0.05)",
              stroke: "rgb(47 154 138 / 0.35)",
              strokeDasharray: "2 4",
              strokeWidth: 1,
            }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const recognized = payload.find((p) => p.dataKey === "recognized");
              const deferred = payload.find(
                (p) => p.dataKey === "deferredClosing"
              );
              return (
                <div className="min-w-[180px] rounded-lg border border-slate-200/70 bg-white/95 px-3 py-2.5 text-xs shadow-[0_8px_28px_-12px_rgba(15,23,42,0.18)] backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/95">
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    {formatMonthTick(String(label))}{" "}
                    <span className="font-normal text-slate-400">
                      · {String(label).slice(0, 7)}
                    </span>
                  </div>
                  {recognized ? (
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-2">
                        <span className="block size-1.5 rounded-full bg-[#2f9a8a]" />
                        <span className="text-slate-600 dark:text-slate-300">
                          {seriesLabels.primary}
                        </span>
                      </div>
                      <span className="font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
                        {formatFullCurrency(
                          Number(recognized.value ?? 0),
                          currency
                        )}
                      </span>
                    </div>
                  ) : null}
                  {deferred ? (
                    <div className="mt-1 flex items-center justify-between gap-6">
                      <div className="flex items-center gap-2">
                        <span className="block size-1.5 rounded-full bg-slate-400/80" />
                        <span className="text-slate-600 dark:text-slate-300">
                          {seriesLabels.closing}
                        </span>
                      </div>
                      <span className="tabular-nums tracking-tight text-slate-700 dark:text-slate-200">
                        {formatFullCurrency(
                          Number(deferred.value ?? 0),
                          currency
                        )}
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            }}
          />

          <Area
            type="monotone"
            dataKey="deferredClosing"
            stroke="#2f9a8a"
            strokeWidth={1.5}
            strokeOpacity={0.55}
            fill={`url(#${areaGradientId})`}
            fillOpacity={1}
            dot={false}
            activeDot={{
              r: 3,
              fill: "#2f9a8a",
              stroke: "white",
              strokeWidth: 1.5,
            }}
            isAnimationActive
            animationDuration={900}
            animationEasing="ease-out"
          />
          <Bar
            dataKey="recognized"
            fill={`url(#${barGradientId})`}
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
            isAnimationActive
            animationDuration={850}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
