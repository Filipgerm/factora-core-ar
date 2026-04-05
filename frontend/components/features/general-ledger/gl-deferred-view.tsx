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

export function GlDeferredView() {
  const { effectiveEntityId, consolidated, displayCurrency } = useLedgerView();
  const { data: schedules = [], isLoading } = useGlRevenueSchedulesQuery({
    legal_entity_id: effectiveEntityId,
    consolidated,
  });

  const primary = schedules[0];
  const chartData =
    primary?.lines.map((l) => ({
      month: l.period_month.slice(0, 7),
      Recognized: Number(l.recognized_in_period),
      "Deferred (closing)": Number(l.deferred_closing),
    })) ?? [];

  return (
    <div className="space-y-8">
      <p className="text-xs text-muted-foreground">
        IFRS 15 revenue waterfall — deferred contract liability vs amounts recognized
        in period (demo schedules).
      </p>
      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}
      {!isLoading && schedules.length === 0 && (
        <p className="text-sm text-muted-foreground">No recognition schedules.</p>
      )}
      {primary && (
        <>
          <Card className="rounded-xl border border-slate-100 p-4 ring-0">
            <Title className="text-sm text-slate-900">
              {primary.contract_name}
            </Title>
            <Text className="text-xs text-slate-500">
              TCV {formatLedgerMoney(primary.total_contract_value, primary.currency)}{" "}
              · display {displayCurrency} cosmetic
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
                {primary.lines.map((l) => (
                  <TableRow
                    key={l.period_month}
                    className="border-slate-100 transition-colors duration-200 hover:bg-slate-50/80"
                  >
                    <TableCell className="text-xs">{l.period_month}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {formatLedgerMoney(l.deferred_opening, primary.currency)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-blue-800">
                      {formatLedgerMoney(l.recognized_in_period, primary.currency)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-slate-600">
                      {formatLedgerMoney(l.deferred_closing, primary.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
