"use client";

import { useId } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";

const axisTickProps = {
  fill: "var(--muted-foreground)",
  fontSize: 11,
};

function currencySymbol(code: string): string {
  if (code === "EUR") return "€";
  if (code === "GBP") return "£";
  return "$";
}

function formatYAxisCompact(n: number, currency: string): string {
  const sym = currencySymbol(currency);
  if (Math.abs(n) >= 1000) {
    return `${sym}${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  }
  return `${sym}${Math.round(n)}`;
}

type BillingRow = { month: string; Billed: number; Unbilled: number };
type RevenueRow = { month: string; Actual: number; Forecasted: number };

function ScheduleTooltipInner({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string }>;
  label?: string;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200/90 bg-popover px-3 py-2 text-xs shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="font-semibold text-foreground">{label}</p>
      <ul className="mt-1.5 space-y-0.5">
        {payload.map((p, i) => {
          const v = p.value;
          const num = typeof v === "number" ? v : Number(v);
          return (
            <li
              key={`${String(p.name)}-${i}`}
              className="flex justify-between gap-6 tabular-nums"
            >
              <span className="text-muted-foreground">{p.name}</span>
              <span className="font-medium text-foreground">
                {!Number.isFinite(num)
                  ? "—"
                  : new Intl.NumberFormat("en-IE", {
                      style: "currency",
                      currency,
                      maximumFractionDigits: 0,
                    }).format(num)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function BillingScheduleChart({
  data,
  valueFormatter,
  currency,
  className,
}: {
  data: BillingRow[];
  valueFormatter: (n: number) => string;
  currency: string;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-gradient-to-b from-orange-50/40 to-transparent dark:from-orange-950/15",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgb(251 146 60) 0%, transparent 55%), radial-gradient(circle at 80% 70%, rgb(234 88 12) 0%, transparent 50%)",
        }}
      />
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 12, right: 12, left: 4, bottom: 8 }}
          barGap={2}
          barCategoryGap="12%"
        >
          <defs>
            <linearGradient id={`billingBilledGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb923c" stopOpacity={1} />
              <stop offset="55%" stopColor="#f97316" stopOpacity={0.98} />
              <stop offset="100%" stopColor="#ea580c" stopOpacity={0.92} />
            </linearGradient>
            <linearGradient id={`billingUnbilledGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fdba74" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#fed7aa" stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 6"
            vertical={false}
            className="stroke-slate-300/55 dark:stroke-slate-600/60"
          />
          <XAxis
            dataKey="month"
            tick={axisTickProps}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={56}
          />
          <YAxis
            tick={axisTickProps}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              formatYAxisCompact(Number(v), currency)
            }
            width={56}
          />
          <Tooltip
            content={(props) => (
              <ScheduleTooltipInner
                active={props.active}
                payload={props.payload as Array<{ name?: string; value?: number | string }>}
                label={props.label}
                currency={currency}
              />
            )}
            cursor={{
              fill: "var(--brand-primary-subtle)",
              opacity: 0.35,
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: 8 }}
            formatter={(value) => (
              <span className="text-muted-foreground text-xs">{value}</span>
            )}
          />
          <Bar
            dataKey="Billed"
            stackId="billing"
            fill={`url(#billingBilledGrad-${uid})`}
            radius={[5, 5, 0, 0]}
            maxBarSize={44}
          />
          <Bar
            dataKey="Unbilled"
            stackId="billing"
            fill={`url(#billingUnbilledGrad-${uid})`}
            radius={[0, 0, 4, 4]}
            maxBarSize={44}
          />
        </BarChart>
      </ResponsiveContainer>
      <span className="sr-only">{data.map((d) => `${d.month}: ${valueFormatter(d.Billed)} billed`).join("; ")}</span>
    </div>
  );
}

export function RevenueScheduleChart({
  data,
  valueFormatter,
  currency,
  className,
}: {
  data: RevenueRow[];
  valueFormatter: (n: number) => string;
  currency: string;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-gradient-to-b from-emerald-50/45 to-transparent dark:from-emerald-950/20",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.14]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 40%, rgb(52 211 153) 0%, transparent 50%), radial-gradient(circle at 75% 60%, rgb(16 185 129) 0%, transparent 55%)",
        }}
      />
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 12, right: 12, left: 4, bottom: 8 }}
          barGap={3}
          barCategoryGap="12%"
        >
          <defs>
            <linearGradient id={`revenueActualGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
              <stop offset="50%" stopColor="#10b981" stopOpacity={0.98} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0.94} />
            </linearGradient>
            <linearGradient id={`revenueForecastGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a7f3d0" stopOpacity={0.75} />
              <stop offset="100%" stopColor="#6ee7b7" stopOpacity={0.45} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 6"
            vertical={false}
            className="stroke-slate-300/55 dark:stroke-slate-600/60"
          />
          <XAxis
            dataKey="month"
            tick={axisTickProps}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={56}
          />
          <YAxis
            tick={axisTickProps}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              formatYAxisCompact(Number(v), currency)
            }
            width={56}
          />
          <Tooltip
            content={(props) => (
              <ScheduleTooltipInner
                active={props.active}
                payload={props.payload as Array<{ name?: string; value?: number | string }>}
                label={props.label}
                currency={currency}
              />
            )}
            cursor={{ fill: "rgba(16, 185, 129, 0.12)" }}
          />
          <Legend
            wrapperStyle={{ paddingTop: 8 }}
            formatter={(value) => (
              <span className="text-muted-foreground text-xs">{value}</span>
            )}
          />
          <Bar
            dataKey="Actual"
            stackId="rev"
            fill={`url(#revenueActualGrad-${uid})`}
            radius={[6, 6, 0, 0]}
            maxBarSize={46}
          />
          <Bar
            dataKey="Forecasted"
            stackId="rev"
            fill={`url(#revenueForecastGrad-${uid})`}
            radius={[0, 0, 6, 6]}
            maxBarSize={46}
          />
        </BarChart>
      </ResponsiveContainer>
      <span className="sr-only">
        {data.map((d) => `${d.month}: ${valueFormatter(d.Actual)} recognized`).join("; ")}
      </span>
    </div>
  );
}
