"use client";

import Link from "next/link";
import { BookMarked } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useGlJournalEntriesQuery } from "@/lib/hooks/api/use-general-ledger";
import { formatLedgerMoney } from "@/components/features/general-ledger/gl-money";

const LIST_PARAMS = {
  consolidated: true as const,
  legal_entity_id: null as string | null,
  account_id: null as string | null,
  status: null as string | null,
  posting_period_id: null as string | null,
  source_batch_id: null as string | null,
};

function JournalsIndexLink({ className }: { className?: string }) {
  return (
    <Link
      href="/general-ledger/journal-entries?consolidated=1"
      className={`inline-flex text-xs font-medium text-blue-700 underline-offset-2 hover:underline dark:text-blue-400 ${className ?? ""}`}
    >
      View all journals
    </Link>
  );
}

export function HomeRecentGlJournals() {
  const { data: entries = [], isLoading, isError } = useGlJournalEntriesQuery(
    LIST_PARAMS
  );

  const recent = entries.slice(0, 5);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="h-4 w-36 animate-pulse rounded bg-muted" />
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/70" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-6 dark:border-slate-700 dark:bg-slate-950">
        <p className="text-sm font-medium text-foreground">Ledger activity</p>
        <p className="mt-1 text-xs text-muted-foreground">
          General ledger journals could not be loaded.
        </p>
      </div>
    );
  }

  if (recent.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-6 dark:border-slate-700 dark:bg-slate-950">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <BookMarked className="size-4 text-muted-foreground" aria-hidden />
          Ledger activity
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          No journal entries yet. Ingested invoices can create draft journals when
          your chart includes detail codes 2110 (AP accrual) and 1110 (AR detail).
        </p>
        <JournalsIndexLink className="mt-3" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BookMarked className="size-4 text-muted-foreground" aria-hidden />
          Recent ledger journals
        </div>
        <JournalsIndexLink />
      </div>
      <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
        {recent.map((e) => (
          <li key={e.id} className="py-2.5 first:pt-0 last:pb-0">
            <Link
              href={`/general-ledger/journal-entries?journal_id=${encodeURIComponent(e.id)}&consolidated=1`}
              className="group flex flex-col gap-0.5 rounded-lg px-1 py-0.5 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs tabular-nums text-muted-foreground">
                  {e.entry_date}
                </span>
                <Badge
                  variant={e.status === "posted" ? "default" : "secondary"}
                  className="text-[10px] capitalize"
                >
                  {e.status}
                </Badge>
              </div>
              <span className="truncate text-xs font-medium text-foreground group-hover:underline">
                {e.memo ?? "—"}
              </span>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {formatLedgerMoney(e.total_debit, e.document_currency)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
