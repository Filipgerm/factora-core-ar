"use client";

import { BarChart, Card, Text, Title } from "@tremor/react";

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
import type { GlRevenueSchedule } from "@/lib/schemas/general-ledger";

function recognitionLabel(method: GlRevenueSchedule["recognition_method"]): string {
  const labels: Record<GlRevenueSchedule["recognition_method"], string> = {
    straight_line: "Straight-line over time",
    milestone: "Milestone-based",
    usage_based: "Usage-based",
  };
  return labels[method];
}

export function GlDeferredView() {
  const { effectiveEntityId, consolidated, displayCurrency } = useLedgerView();
  const { data: schedules = [], isLoading } = useGlRevenueSchedulesQuery({
    legal_entity_id: effectiveEntityId,
    consolidated,
  });

  return (
    <div className="space-y-8">
      <p className="text-xs text-muted-foreground">
        IFRS 15 revenue waterfall — deferred contract liability vs amounts recognized
        in period. Recognition method is explicit per contract for auditability.
      </p>
      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}
      {!isLoading && schedules.length === 0 && (
        <p className="text-sm text-muted-foreground">No recognition schedules.</p>
      )}
      {schedules.map((sch) => {
        const chartData = sch.lines.map((l) => ({
          month: l.period_month.slice(0, 7),
          Recognized: Number(l.recognized_in_period),
          "Deferred (closing)": Number(l.deferred_closing),
        }));
        return (
          <div key={sch.id} className="space-y-4">
            <Card className="rounded-xl border border-slate-100 p-4 ring-0">
              <Title className="text-sm text-slate-900">
                {sch.contract_name}
              </Title>
              <Text className="text-xs text-slate-500">
                <span className="font-medium text-slate-700">
                  {recognitionLabel(sch.recognition_method)}
                </span>
                {" · "}
                TCV {formatLedgerMoney(sch.total_contract_value, sch.currency)}
                {" · "}
                display {displayCurrency} cosmetic
              </Text>
              <BarChart
                className="mt-4 h-56"
                data={chartData}
                index="month"
                categories={["Recognized", "Deferred (closing)"]}
                colors={["blue", "slate"]}
                yAxisWidth={48}
              />
            </Card>
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="text-xs">Month</TableHead>
                    <TableHead className="text-right text-xs">Deferred opening</TableHead>
                    <TableHead className="text-right text-xs">Recognized</TableHead>
                    <TableHead className="text-right text-xs">Deferred closing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sch.lines.map((l) => (
                    <TableRow
                      key={`${sch.id}-${l.period_month}`}
                      className="border-slate-100 transition-colors duration-200 hover:bg-slate-50/80"
                    >
                      <TableCell className="text-xs">{l.period_month}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {formatLedgerMoney(l.deferred_opening, sch.currency)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-blue-800">
                        {formatLedgerMoney(l.recognized_in_period, sch.currency)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-slate-600">
                        {formatLedgerMoney(l.deferred_closing, sch.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
