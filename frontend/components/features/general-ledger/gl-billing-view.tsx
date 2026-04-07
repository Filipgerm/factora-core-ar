"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Database } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useGlBillingBatchesQuery } from "@/lib/hooks/api/use-general-ledger";
import { formatLedgerMoney } from "@/components/features/general-ledger/gl-money";

export function GlBillingView() {
  const searchParams = useSearchParams();
  const q = searchParams.toString();
  const { data: batches = [], isLoading } = useGlBillingBatchesQuery();

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Aggregated usage batches from external billing engines (demo integrations).
        Raw micro-events are not stored — only rollups.
      </p>
      <div className="overflow-hidden rounded-xl border border-slate-100">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="text-xs">Batch ID</TableHead>
              <TableHead className="text-xs">Source</TableHead>
              <TableHead className="text-right text-xs">Events</TableHead>
              <TableHead className="text-right text-xs">Total</TableHead>
              <TableHead className="text-xs">Received</TableHead>
              <TableHead className="text-xs">Drill-down</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-xs text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && batches.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-8">
                    <Database className="size-8 text-slate-300" aria-hidden />
                    <p className="text-sm text-muted-foreground">
                      No billing batches yet. Seed the demo org or connect a billing
                      integration.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {batches.map((b) => (
              <TableRow
                key={b.id}
                className="border-slate-100 transition-colors duration-200 hover:bg-slate-50/80"
              >
                <TableCell className="font-mono text-xs">
                  {b.external_batch_id}
                </TableCell>
                <TableCell className="text-xs">{b.source_system}</TableCell>
                <TableCell className="text-right text-xs tabular-nums">
                  {b.event_count.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-xs tabular-nums">
                  {formatLedgerMoney(b.total_amount, b.currency)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(b.received_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Button variant="link" className="h-auto p-0 text-xs" asChild>
                    <Link
                      href={(() => {
                        const sp = new URLSearchParams(
                          q ? q : undefined
                        );
                        sp.set("source_batch_id", b.external_batch_id);
                        return `/general-ledger/journal-entries?${sp.toString()}`;
                      })()}
                    >
                      Linked journals
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
