"use client";

import { useCallback, useState } from "react";

import { ReportDatePresetBar } from "@/components/features/reporting/report-date-preset-bar";
import { ReportPageShell } from "@/components/features/reporting/report-page-shell";
import { TransactionDetailSheet } from "@/components/features/reporting/transaction-detail-sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatStatementEUR,
  INCOME_MOM_PERIOD_KEYS,
  INCOME_MOM_PERIOD_LABELS,
  INCOME_STATEMENT_ROWS,
  type IncomeStatementRow,
} from "@/lib/mock-data/financial-statements-mocks";
import { cn } from "@/lib/utils";

const CELL = "px-3 py-2.5 text-sm tabular-nums tracking-tight";
const TH = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground";

const AMOUNT_INTERACTIVE =
  "cursor-pointer transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-900/50";

function InteractiveAmountTd({
  display,
  isSection,
  onOpen,
}: {
  display: string;
  isSection: boolean;
  onOpen: () => void;
}) {
  if (isSection) {
    return (
      <td className={cn(CELL, "text-right text-transparent")}>—</td>
    );
  }
  return (
    <td className={cn(CELL, "text-right", AMOUNT_INTERACTIVE)} role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}>
      {display}
    </td>
  );
}

function rowClass(row: IncomeStatementRow): string {
  if (row.kind === "section") {
    return "bg-slate-50/90 font-semibold text-foreground dark:bg-slate-900/40";
  }
  if (row.kind === "subtotal" || row.kind === "total") {
    return "border-t border-slate-200/80 bg-white font-semibold dark:border-slate-800";
  }
  if (row.kind === "highlight") {
    return "bg-emerald-50/80 font-semibold text-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-100";
  }
  return "bg-white dark:bg-background";
}

function IncomeSummaryTable({ onOpenDetail }: { onOpenDetail: (rowLabel: string) => void }) {
  return (
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
          {INCOME_STATEMENT_ROWS.map((row) => (
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
                  row.kind === "section" && "text-foreground"
                )}
              >
                {row.label}
              </td>
              <InteractiveAmountTd
                isSection={row.kind === "section"}
                display={formatStatementEUR(row.currentMonth)}
                onOpen={() => onOpenDetail(row.label)}
              />
              <InteractiveAmountTd
                isSection={row.kind === "section"}
                display={formatStatementEUR(row.ytd)}
                onOpen={() => onOpenDetail(row.label)}
              />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IncomeMomTable({ onOpenDetail }: { onOpenDetail: (rowLabel: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200/90 dark:border-slate-800">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
            <th className={TH}>Account</th>
            {INCOME_MOM_PERIOD_KEYS.map((k) => (
              <th key={k} className={cn(TH, "text-right")}>
                {INCOME_MOM_PERIOD_LABELS[k]}
              </th>
            ))}
            <th className={cn(TH, "text-right")}>YTD</th>
          </tr>
        </thead>
        <tbody>
          {INCOME_STATEMENT_ROWS.map((row) => (
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
                  row.kind === "line" && "pl-6 text-muted-foreground"
                )}
              >
                {row.label}
              </td>
              {INCOME_MOM_PERIOD_KEYS.map((k) => (
                <InteractiveAmountTd
                  key={k}
                  isSection={row.kind === "section"}
                  display={formatStatementEUR(row.valuesByPeriod?.[k] ?? 0)}
                  onOpen={() => onOpenDetail(row.label)}
                />
              ))}
              <InteractiveAmountTd
                isSection={row.kind === "section"}
                display={formatStatementEUR(row.ytd)}
                onOpen={() => onOpenDetail(row.label)}
              />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function IncomeStatementReport() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetRowLabel, setSheetRowLabel] = useState("");

  const onOpenDetail = useCallback((rowLabel: string) => {
    setSheetRowLabel(rowLabel);
    setSheetOpen(true);
  }, []);

  return (
    <ReportPageShell
      title="Income statement"
      subtitle="Summary performance for the current period and year-to-date, with a month-over-month comparison."
      exportFileStem="income-statement"
    >
      <ReportDatePresetBar className="mb-5" />
      <Tabs defaultValue="summary" className="gap-4">
        <TabsList className="h-10 rounded-full border border-slate-200/80 bg-slate-50/80 p-1 dark:border-slate-800 dark:bg-slate-900/40">
          <TabsTrigger
            value="summary"
            className="rounded-full px-4 text-xs font-semibold data-[state=active]:shadow-sm"
          >
            Summary
          </TabsTrigger>
          <TabsTrigger
            value="mom"
            className="rounded-full px-4 text-xs font-semibold data-[state=active]:shadow-sm"
          >
            Month over month
          </TabsTrigger>
        </TabsList>
        <TabsContent value="summary" className="mt-0">
          <IncomeSummaryTable onOpenDetail={onOpenDetail} />
        </TabsContent>
        <TabsContent value="mom" className="mt-0">
          <IncomeMomTable onOpenDetail={onOpenDetail} />
        </TabsContent>
      </Tabs>
      <TransactionDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        contextLabel={sheetRowLabel ? `Account: ${sheetRowLabel}` : undefined}
      />
      <p className="mt-4 rounded-lg border border-dashed border-slate-200/90 bg-slate-50/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground dark:border-slate-800 dark:bg-slate-900/25">
        Prepared for management review under IFRS principles. Amounts are illustrative mock
        data; tie-out to general ledger is required before external distribution.
      </p>
    </ReportPageShell>
  );
}
