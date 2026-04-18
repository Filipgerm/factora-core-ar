"use client";

import { motion } from "framer-motion";
import { Sparkles, Layers, TrendingUp, Wallet } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGlRevenueSchedulesQuery } from "@/lib/hooks/api/use-general-ledger";
import { useLedgerView } from "@/components/features/general-ledger/ledger-view-context";
import { formatLedgerMoney } from "@/components/features/general-ledger/gl-money";
import { RevenueWaterfallChart } from "@/components/features/general-ledger/revenue-waterfall-chart";
import type { GlRevenueSchedule } from "@/lib/schemas/general-ledger";
import { cn } from "@/lib/utils";

const CARD_SPRING = { type: "spring" as const, stiffness: 620, damping: 42 };

function recognitionLabel(method: GlRevenueSchedule["recognition_method"]): string {
  const labels: Record<GlRevenueSchedule["recognition_method"], string> = {
    straight_line: "Straight-line over time",
    milestone: "Milestone-based",
    usage_based: "Usage-based",
  };
  return labels[method];
}

function formatShortMonth(raw: string): string {
  if (!raw || raw.length < 7) return raw;
  const [year, month] = raw.slice(0, 7).split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString("en-IE", { month: "short", year: "2-digit" });
}

interface ScheduleMetrics {
  recognizedToDate: number;
  remainingDeferred: number;
  completionPct: number;
}

function computeMetrics(schedule: GlRevenueSchedule): ScheduleMetrics {
  const recognizedToDate = schedule.lines.reduce(
    (sum, l) => sum + Number(l.recognized_in_period),
    0
  );
  const lastLine = schedule.lines[schedule.lines.length - 1];
  const remainingDeferred = lastLine
    ? Number(lastLine.deferred_closing)
    : Number(schedule.total_contract_value);
  const tcv = Number(schedule.total_contract_value) || 1;
  const completionPct = Math.min(100, (recognizedToDate / tcv) * 100);
  return { recognizedToDate, remainingDeferred, completionPct };
}

interface MicroKpiProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: "teal" | "slate";
}

function MicroKpi({ label, value, icon, accent = "slate" }: MicroKpiProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-colors duration-200",
        accent === "teal"
          ? "border-teal-200/60 bg-[var(--brand-primary-subtle)]"
          : "border-slate-100 bg-slate-50/60"
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-md",
          accent === "teal"
            ? "bg-white/70 text-[color:var(--brand-primary)]"
            : "bg-white text-slate-500"
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </div>
        <div className="truncate text-sm font-semibold tabular-nums tracking-tight text-slate-900">
          {value}
        </div>
      </div>
    </div>
  );
}

function DeferredViewSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          <div className="mb-5 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3.5 w-48 animate-pulse rounded bg-slate-100" />
              <div className="h-2.5 w-64 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="h-5 w-24 animate-pulse rounded-full bg-slate-100" />
          </div>
          <div className="grid gap-2.5 sm:grid-cols-4">
            {[0, 1, 2, 3].map((k) => (
              <div
                key={k}
                className="h-14 animate-pulse rounded-lg bg-slate-100/70"
              />
            ))}
          </div>
          <div className="mt-5 h-[260px] animate-pulse rounded-xl bg-slate-50" />
        </div>
      ))}
    </div>
  );
}

export function GlDeferredView() {
  const { effectiveEntityId, consolidated, displayCurrency } = useLedgerView();
  const { data: schedules = [], isLoading } = useGlRevenueSchedulesQuery({
    legal_entity_id: effectiveEntityId,
    consolidated,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2.5 rounded-lg border border-teal-200/50 bg-[var(--brand-primary-subtle)] px-4 py-3">
        <Sparkles
          className="mt-0.5 size-4 shrink-0 text-[color:var(--brand-primary)]"
          aria-hidden
        />
        <p className="text-xs leading-relaxed text-slate-700">
          <span className="font-semibold text-slate-900">
            IFRS 15 revenue waterfall
          </span>{" "}
          — deferred contract liability drawn down over time against the revenue
          recognized in each period. Recognition method is explicit per contract
          for auditability.
        </p>
      </div>

      {isLoading && <DeferredViewSkeleton />}

      {!isLoading && schedules.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
          <Layers className="size-8 text-slate-300" aria-hidden />
          <p className="text-sm font-medium text-slate-700">
            No recognition schedules yet
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Deferred revenue schedules will appear here once contracts with
            multi-period recognition are posted to the ledger.
          </p>
        </div>
      )}

      {schedules.map((sch, idx) => {
        const metrics = computeMetrics(sch);
        const chartData = sch.lines.map((l) => ({
          month: l.period_month,
          recognized: Number(l.recognized_in_period),
          deferredClosing: Number(l.deferred_closing),
        }));
        return (
          <motion.section
            key={sch.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...CARD_SPRING, delay: 0.04 + idx * 0.06 }}
            className="group rounded-2xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-14px_rgba(15,23,42,0.08)] transition-shadow duration-200 hover:shadow-[0_2px_6px_rgba(15,23,42,0.05),0_18px_40px_-16px_rgba(15,23,42,0.12)]"
          >
            <header className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--brand-primary)]">
                  {recognitionLabel(sch.recognition_method)}
                </div>
                <h3 className="mt-1.5 truncate text-base font-semibold tracking-tight text-slate-900">
                  {sch.contract_name}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                  <span className="tabular-nums">
                    TCV{" "}
                    <span className="font-medium text-slate-700">
                      {formatLedgerMoney(sch.total_contract_value, sch.currency)}
                    </span>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>
                    display{" "}
                    <span className="font-medium text-slate-600">
                      {displayCurrency}
                    </span>{" "}
                    cosmetic
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Completion
                  </div>
                  <div className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-slate-900">
                    {metrics.completionPct.toFixed(1)}%
                  </div>
                </div>
                <div className="relative h-8 w-24 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[color:var(--brand-primary)] to-teal-400 transition-[width] duration-500"
                    style={{ width: `${metrics.completionPct}%` }}
                  />
                </div>
              </div>
            </header>

            <div className="grid gap-2.5 px-6 pt-5 sm:grid-cols-2 lg:grid-cols-4">
              <MicroKpi
                label="Total contract value"
                value={formatLedgerMoney(sch.total_contract_value, sch.currency)}
                icon={<Wallet className="size-4" aria-hidden />}
              />
              <MicroKpi
                label="Recognized to date"
                value={formatLedgerMoney(metrics.recognizedToDate, sch.currency)}
                icon={<TrendingUp className="size-4" aria-hidden />}
                accent="teal"
              />
              <MicroKpi
                label="Remaining deferred"
                value={formatLedgerMoney(metrics.remainingDeferred, sch.currency)}
                icon={<Layers className="size-4" aria-hidden />}
              />
              <MicroKpi
                label="Periods"
                value={`${sch.lines.length} months`}
                icon={<Sparkles className="size-4" aria-hidden />}
              />
            </div>

            <div className="px-6 pb-5 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                    <span className="block size-2 rounded-sm bg-gradient-to-b from-[color:var(--brand-primary)] to-teal-500" />
                    <span>Recognized in period</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                    <span className="block h-0.5 w-4 rounded-full bg-[color:var(--brand-primary)]/60" />
                    <span>Deferred (closing)</span>
                  </div>
                </div>
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
                  {sch.lines.length > 0
                    ? `${formatShortMonth(sch.lines[0].period_month)} — ${formatShortMonth(sch.lines[sch.lines.length - 1].period_month)}`
                    : ""}
                </span>
              </div>
              <RevenueWaterfallChart
                data={chartData}
                currency={sch.currency}
              />
            </div>

            <div className="border-t border-slate-100">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/60 hover:bg-slate-50/60">
                    <TableHead className="pl-6 text-xs">Month</TableHead>
                    <TableHead className="text-right text-xs">
                      Deferred opening
                    </TableHead>
                    <TableHead className="text-right text-xs">
                      Recognized
                    </TableHead>
                    <TableHead className="pr-6 text-right text-xs">
                      Deferred closing
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sch.lines.map((l) => (
                    <TableRow
                      key={`${sch.id}-${l.period_month}`}
                      className="border-slate-100 transition-colors duration-200 hover:bg-slate-50/80"
                    >
                      <TableCell className="pl-6 text-xs">
                        {l.period_month}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {formatLedgerMoney(l.deferred_opening, sch.currency)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium tabular-nums text-[color:var(--brand-primary)]">
                        {formatLedgerMoney(
                          l.recognized_in_period,
                          sch.currency
                        )}
                      </TableCell>
                      <TableCell className="pr-6 text-right text-xs tabular-nums text-slate-600">
                        {formatLedgerMoney(l.deferred_closing, sch.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}
