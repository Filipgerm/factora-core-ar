"use client";

import { ReportPageShell } from "@/components/features/reporting/report-page-shell";
import {
  BALANCE_SHEET_INSIGHT,
  BALANCE_SHEET_ROWS,
  formatStatementEUR,
  type BalanceSheetRow,
} from "@/lib/mock-data/financial-statements-mocks";
import { cn } from "@/lib/utils";

const CELL = "px-3 py-2.5 text-sm tabular-nums tracking-tight";
const TH = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground";

function rowClass(row: BalanceSheetRow): string {
  switch (row.kind) {
    case "section":
      return "bg-slate-50/90 font-semibold text-foreground dark:bg-slate-900/40";
    case "subsection":
      return "bg-slate-50/50 text-sm font-medium text-foreground dark:bg-slate-900/25";
    case "subtotal":
    case "total":
      return "border-t border-slate-200/80 bg-white font-semibold dark:border-slate-800";
    case "reconcile":
      return "border-t-2 border-slate-300 bg-slate-50/80 font-semibold dark:border-slate-600 dark:bg-slate-900/35";
    default:
      return "bg-white dark:bg-background";
  }
}

export function BalanceSheetReport() {
  return (
    <ReportPageShell
      title="Balance sheet"
      subtitle="Assets, liabilities, and equity with prior-month comparison."
      exportFileStem="balance-sheet"
    >
      <div className="overflow-x-auto rounded-xl border border-slate-200/90 dark:border-slate-800">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
              <th className={TH}>Account</th>
              <th className={cn(TH, "text-right")}>Balance</th>
              <th className={cn(TH, "text-right")}>Prior month</th>
            </tr>
          </thead>
          <tbody>
            {BALANCE_SHEET_ROWS.map((row) => (
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
                    (row.kind === "subsection" || row.kind === "section") && "pl-3"
                  )}
                >
                  {row.label}
                </td>
                <td
                  className={cn(
                    CELL,
                    "text-right",
                    row.kind === "section" ||
                      row.kind === "subsection"
                      ? "text-transparent"
                      : ""
                  )}
                >
                  {row.kind === "section" || row.kind === "subsection"
                    ? "—"
                    : formatStatementEUR(row.balance)}
                </td>
                <td
                  className={cn(
                    CELL,
                    "text-right",
                    row.kind === "section" ||
                      row.kind === "subsection"
                      ? "text-transparent"
                      : ""
                  )}
                >
                  {row.kind === "section" || row.kind === "subsection"
                    ? "—"
                    : formatStatementEUR(row.priorMonth)}
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
          {BALANCE_SHEET_INSIGHT}
        </p>
      </div>
    </ReportPageShell>
  );
}
