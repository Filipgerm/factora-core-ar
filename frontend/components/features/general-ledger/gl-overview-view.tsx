"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, BookOpen } from "lucide-react";
import { Card, Metric, Text } from "@tremor/react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGlJournalEntriesQuery } from "@/lib/hooks/api/use-general-ledger";
import { useGlTrialBalanceQuery } from "@/lib/hooks/api/use-general-ledger";
import { useLedgerView } from "@/components/features/general-ledger/ledger-view-context";
import { formatLedgerMoney } from "@/components/features/general-ledger/gl-money";

export function GlOverviewView() {
  const { effectiveEntityId, consolidated, displayCurrency } = useLedgerView();
  const searchParams = useSearchParams();
  function journalHref(accountId: string) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("accountId", accountId);
    return `/general-ledger/journal-entries?${sp.toString()}`;
  }

  const { data: tb = [], isLoading: tbLoading } = useGlTrialBalanceQuery({
    legal_entity_id: effectiveEntityId,
    consolidated,
    posting_period_id: null,
  });

  const { data: recent = [], isLoading: jrLoading } = useGlJournalEntriesQuery(
    {
      legal_entity_id: effectiveEntityId,
      consolidated,
      account_id: null,
      status: null,
      posting_period_id: null,
      source_batch_id: null,
    }
  );

  const totalDebit = tb.reduce((s, r) => s + r.debit_total, 0);
  const totalCredit = tb.reduce((s, r) => s + r.credit_total, 0);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-xl border border-slate-100 p-4 shadow-none ring-0 transition-all duration-200">
          <Text className="text-xs text-slate-500">Trial balance — debits</Text>
          <Metric className="mt-1 text-slate-900">
            {tbLoading
              ? "…"
              : formatLedgerMoney(totalDebit, displayCurrency)}
          </Metric>
        </Card>
        <Card className="rounded-xl border border-slate-100 p-4 shadow-none ring-0 transition-all duration-200">
          <Text className="text-xs text-slate-500">Trial balance — credits</Text>
          <Metric className="mt-1 text-slate-900">
            {tbLoading
              ? "…"
              : formatLedgerMoney(totalCredit, displayCurrency)}
          </Metric>
        </Card>
        <Card className="rounded-xl border border-slate-100 p-4 shadow-none ring-0 transition-all duration-200">
          <Text className="text-xs text-slate-500">Open journals (loaded)</Text>
          <Metric className="mt-1 text-slate-900">
            {jrLoading ? "…" : recent.length}
          </Metric>
        </Card>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">
            Trial balance
          </h2>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="transition-all duration-200"
          >
            <Link
              href={`/general-ledger/chart-of-accounts${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
            >
              Chart of accounts
              <ArrowRight className="ml-1 size-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-100">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="text-xs">Account</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-right text-xs">Debit</TableHead>
                <TableHead className="text-right text-xs">Credit</TableHead>
                <TableHead className="text-right text-xs">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tbLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-xs text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!tbLoading && tb.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-6">
                      <BookOpen
                        className="size-8 text-slate-300"
                        aria-hidden
                      />
                      <p className="text-sm text-muted-foreground">
                        No posted activity yet. Post a journal or seed the demo
                        database.
                      </p>
                      <Button
                        asChild
                        size="sm"
                        className="mt-1 transition-all duration-200"
                      >
                        <Link
                          href={`/general-ledger/journal-entries/new${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
                        >
                          New journal entry
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {tb.map((row) => (
                <TableRow
                  key={row.account_id}
                  className="border-slate-100 transition-colors duration-200 hover:bg-slate-50/80"
                >
                  <TableCell className="text-xs">
                    <span className="font-medium">{row.account_code}</span>{" "}
                    <span className="text-muted-foreground">
                      {row.account_name}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs capitalize text-muted-foreground">
                    {row.account_type}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {row.debit_total > 0 ? (
                      <Link
                        href={journalHref(row.account_id)}
                        className="text-blue-700 underline decoration-blue-200 underline-offset-2 transition-colors duration-200 hover:text-blue-900"
                      >
                        {formatLedgerMoney(row.debit_total, displayCurrency)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {row.credit_total > 0 ? (
                      <Link
                        href={journalHref(row.account_id)}
                        className="text-blue-700 underline decoration-blue-200 underline-offset-2 transition-colors duration-200 hover:text-blue-900"
                      >
                        {formatLedgerMoney(row.credit_total, displayCurrency)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums font-medium text-slate-800">
                    {formatLedgerMoney(row.net_balance, displayCurrency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
