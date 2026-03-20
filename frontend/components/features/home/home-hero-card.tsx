"use client";

import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { GreetingHeader } from "@/components/features/home/greeting-header";

const HERO_TREND = [
  { m: "Aug", v: 2.85 },
  { m: "Sep", v: 3.02 },
  { m: "Oct", v: 3.18 },
  { m: "Nov", v: 3.45 },
  { m: "Dec", v: 3.78 },
  { m: "Jan", v: 4.24 },
];

export function HomeHeroCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="col-span-12 overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-muted/25 p-8 shadow-sm dark:from-card dark:via-card dark:to-muted/15"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
        <GreetingHeader />
        <div className="relative min-h-[140px] rounded-xl border border-border/30 bg-gradient-to-b from-muted/20 to-transparent p-4 dark:from-muted/10">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Revenue trajectory
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Normalized ARR trend (€M) — last 6 months
          </p>
          <div className="mt-2 h-[100px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HERO_TREND} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--brand-primary)"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--brand-primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="m"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide domain={["dataMin - 0.2", "dataMax + 0.2"]} />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.[0] ? (
                      <div className="rounded-lg border border-border/50 bg-popover/95 px-2.5 py-1.5 text-xs shadow-md backdrop-blur-sm">
                        <span className="font-medium tabular-nums text-foreground">
                          €{Number(payload[0].value).toFixed(2)}M
                        </span>
                      </div>
                    ) : null
                  }
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="var(--brand-primary)"
                  strokeWidth={2}
                  fill="url(#heroArea)"
                  isAnimationActive={true}
                  animationDuration={1200}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
