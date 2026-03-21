"use client";

import { ReportPageShell } from "@/components/features/reporting/report-page-shell";
import {
  CASH_FLOW_INSIGHT,
  CASH_FLOW_ROWS,
  formatStatementEUR,
  type CashFlowRow,
} from "@/lib/mock-data/financial-statements-mocks";
import { cn } from "@/lib/utils";

const CELL = "px-3 py-2.5 text-sm tabular-nums tracking-tight";
const TH = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground";

function rowClass(row: CashFlowRow): string {
  switch (row.kind) {
    case "section":
      return "bg-slate-50/90 font-semibold text-foreground dark:bg-slate-900/40";
    case "ops-highlight":
      return "bg-emerald-50/85 font-semibold text-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-100";
    case "subtotal":
    case "total":
      return "border-t border-slate-200/80 bg-white font-semibold dark:border-slate-800";
    case "closing":
      return "border-t-2 border-slate-400/90 bg-white text-base font-bold dark:border-slate-500";
    default:
      return "bg-white dark:bg-background";
  }
}

export function CashFlowReport() {
  return (
    <ReportPageShell
      title="Cash flow statement"
      subtitle="Operating, investing, and financing cash movements for the period."
      exportFileStem="cash-flow-statement"
    >
      <div className="overflow-x-auto rounded-xl border border-slate-200/90 dark:border-slate-800">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
              <th className={TH}>Account</th>
              <th className={cn(TH, "text-right")}>Current month</th>
              <th className={cn(TH, "text-right")}>YTD</th>
            </tr>
          </thead>
          <tbody>
            {CASH_FLOW_ROWS.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-slate-100 last:border-b-0 dark:border-slate-800/80",
                  rowClass(row)
                )}
              >
                <td
                  className={cn(
                    CELL,
                    row.kind === "line" && "pl-6 text-muted-foreground",
                    row.kind === "closing" && "pl-3 font-bold text-foreground"
                  )}
                >
                  {row.label}
                </td>
                <td
                  className={cn(
                    CELL,
                    "text-right",
                    row.kind === "section" && "text-transparent"
                  )}
                >
                  {row.kind === "section" ? "—" : formatStatementEUR(row.currentMonth)}
                </td>
                <td
                  className={cn(
                    CELL,
                    "text-right",
                    row.kind === "section" && "text-transparent"
                  )}
                >
                  {row.kind === "section" ? "—" : formatStatementEUR(row.ytd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/30">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Key insight
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
          {CASH_FLOW_INSIGHT}
        </p>
      </div>
    </ReportPageShell>
  );
}
