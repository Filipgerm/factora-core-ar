"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { JournalEntryInspectorSheet } from "@/components/features/general-ledger/journal-entry-inspector-sheet";
import { useGlAccountsQuery } from "@/lib/hooks/api/use-general-ledger";
import {
  useGlJournalEntriesQuery,
  usePatchGlJournalMutation,
  usePostGlJournalMutation,
} from "@/lib/hooks/api/use-general-ledger";
import { isApiError } from "@/lib/api/types";
import { useToast } from "@/hooks/use-toast";
import { useLedgerView } from "@/components/features/general-ledger/ledger-view-context";
import { formatLedgerMoney } from "@/components/features/general-ledger/gl-money";
import type {
  GlAccount,
  GlJournalEntry,
  GlJournalLine,
} from "@/lib/schemas/general-ledger";

/** Ensures the line's account appears in the select even when inactive or control-only. */
function accountOptionsForJournalLine(
  selectable: GlAccount[],
  allAccounts: GlAccount[],
  lineAccountId: string
): GlAccount[] {
  const selectableIds = new Set(selectable.map((a) => a.id));
  const current = allAccounts.find((a) => a.id === lineAccountId);
  if (current && !selectableIds.has(current.id)) {
    return [current, ...selectable];
  }
  if (!current && lineAccountId && !selectableIds.has(lineAccountId)) {
    return [
      {
        id: lineAccountId,
        parent_account_id: null,
        code: "—",
        name: "Account missing from chart",
        account_type: "expense",
        normal_balance: "debit",
        subledger_kind: "none",
        is_active: false,
        is_control_account: false,
        sort_order: 0,
      },
      ...selectable,
    ];
  }
  return selectable;
}

export function GlJournalsView() {
  const { toast } = useToast();
  const { effectiveEntityId, consolidated } = useLedgerView();
  const searchParams = useSearchParams();
  const accountId = searchParams.get("accountId");
  const sourceBatchId = searchParams.get("source_batch_id");
  const journalIdParam = searchParams.get("journal_id");
  const qBase = searchParams.toString();
  const clearAccountHref = useMemo(() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("accountId");
    const qs = sp.toString();
    return qs
      ? `/general-ledger/journal-entries?${qs}`
      : "/general-ledger/journal-entries";
  }, [searchParams]);

  const { data: entries = [], isLoading } = useGlJournalEntriesQuery({
    legal_entity_id: effectiveEntityId,
    consolidated,
    account_id: accountId,
    status: null,
    posting_period_id: null,
    source_batch_id: sourceBatchId,
  });
  const { data: accounts = [] } = useGlAccountsQuery();
  const postMut = usePostGlJournalMutation();
  const patchMut = usePatchGlJournalMutation();

  const [sheetId, setSheetId] = useState<string | null>(null);
  const [draftEdit, setDraftEdit] = useState<GlJournalEntry | null>(null);
  const [lineEdits, setLineEdits] = useState<GlJournalLine[] | null>(null);

  useEffect(() => {
    if (journalIdParam) {
      setSheetId(journalIdParam);
    }
  }, [journalIdParam]);

  const selectableAccounts = useMemo(
    () => accounts.filter((a) => !a.is_control_account && a.is_active),
    [accounts]
  );
  const selectableAccountIds = useMemo(
    () => new Set(selectableAccounts.map((a) => a.id)),
    [selectableAccounts]
  );
  const accLabel = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, `${a.code} ${a.name}`])),
    [accounts]
  );

  function startDraftEdit(e: GlJournalEntry) {
    if (e.status !== "draft") return;
    setDraftEdit(e);
    setLineEdits(e.lines.map((l) => ({ ...l })));
  }

  async function saveDraftLines() {
    if (!draftEdit || !lineEdits) return;
    await patchMut.mutateAsync({
      id: draftEdit.id,
      body: {
        lines: lineEdits.map((l, i) => ({
          account_id: l.account_id,
          description: l.description,
          debit: l.debit,
          credit: l.credit,
          line_order: i,
          dimension_value_ids: l.dimension_value_ids,
        })),
      },
    });
    setDraftEdit(null);
    setLineEdits(null);
  }

  const totalDebit =
    lineEdits?.reduce((s, l) => s + l.debit, 0) ?? 0;
  const totalCredit =
    lineEdits?.reduce((s, l) => s + l.credit, 0) ?? 0;
  const balanced = totalDebit === totalCredit && totalDebit > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {accountId && (
            <span>
              Filtered by account ·{" "}
              <Link href={clearAccountHref} className="text-blue-700 underline">
                clear
              </Link>
            </span>
          )}
        </div>
        <Button asChild className="gap-1.5 transition-all duration-200">
          <Link
            href={`/general-ledger/journal-entries/new${qBase ? `?${qBase}` : ""}`}
          >
            <Plus className="size-4" aria-hidden />
            New journal
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Memo</TableHead>
              <TableHead className="text-right text-xs">Total</TableHead>
              <TableHead className="text-right text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-xs text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No journal entries match filters.
                </TableCell>
              </TableRow>
            )}
            {entries.map((e) => (
              <TableRow
                key={e.id}
                className="cursor-pointer border-slate-100 transition-colors duration-200 hover:bg-slate-50/80"
                onClick={() => setSheetId(e.id)}
              >
                <TableCell className="text-xs tabular-nums text-muted-foreground">
                  {e.entry_date}
                </TableCell>
                <TableCell className="text-xs">
                  <Badge
                    variant={e.status === "posted" ? "default" : "secondary"}
                    className="text-[10px] capitalize"
                  >
                    {e.status}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-xs">
                  {e.memo ?? "—"}
                </TableCell>
                <TableCell className="text-right text-xs tabular-nums">
                  <span>{formatLedgerMoney(e.total_debit, e.document_currency)}</span>
                  {e.source_batch_id && (
                    <Link
                      href={`/general-ledger/journal-entries?${new URLSearchParams({
                        ...(qBase
                          ? Object.fromEntries(new URLSearchParams(qBase))
                          : {}),
                        source_batch_id: e.source_batch_id,
                      }).toString()}`}
                      className="ml-2 text-[10px] text-blue-700 underline"
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      batch
                    </Link>
                  )}
                </TableCell>
                <TableCell className="text-right text-xs">
                  {e.status === "draft" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mr-1 h-7 text-[10px] transition-all duration-200"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        startDraftEdit(e);
                      }}
                    >
                      Edit lines
                    </Button>
                  )}
                  {e.status === "draft" && (
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-[10px] transition-all duration-200"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        void (async () => {
                          try {
                            await postMut.mutateAsync(e.id);
                          } catch (err) {
                            toast({
                              title: "Could not post journal",
                              description: isApiError(err)
                                ? err.message
                                : "Unexpected error",
                              variant: "destructive",
                            });
                          }
                        })();
                      }}
                    >
                      Post
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <JournalEntryInspectorSheet
        entryId={sheetId}
        open={Boolean(sheetId)}
        onOpenChange={(o) => !o && setSheetId(null)}
        onJumpToEntry={(id) => setSheetId(id)}
        onReversalCreated={(id) => setSheetId(id)}
      />

      {draftEdit && lineEdits && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/20 p-4 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-xl border border-slate-100 bg-white p-4 shadow-lg">
            <h3 className="text-sm font-semibold">Draft lines — inline edit</h3>
            <p className="text-xs text-muted-foreground">
              Adjust amounts and accounts. Control accounts are excluded from picks.
            </p>
            <div className="mt-3 space-y-2">
              {lineEdits.map((ln, idx) => {
                const lineAccountOptions = accountOptionsForJournalLine(
                  selectableAccounts,
                  accounts,
                  ln.account_id
                );
                const lineAccountNotSelectable =
                  Boolean(ln.account_id) &&
                  !selectableAccountIds.has(ln.account_id);
                return (
                  <div
                    key={ln.id}
                    className="grid grid-cols-12 gap-2 border-b border-slate-50 py-2"
                  >
                    <div className="col-span-4 space-y-1">
                      <select
                        className={`h-9 w-full rounded-md border bg-white px-2 text-xs transition-all duration-200 ${lineAccountNotSelectable
                          ? "border-amber-300"
                          : "border-slate-200"
                          }`}
                        value={ln.account_id}
                        onChange={(ev) => {
                          const v = ev.target.value;
                          setLineEdits((prev) =>
                            prev?.map((x, i) =>
                              i === idx ? { ...x, account_id: v } : x
                            ) ?? null
                          );
                        }}
                      >
                        {lineAccountOptions.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} — {a.name}
                            {!a.is_active ? " (inactive)" : ""}
                            {a.is_control_account ? " (control)" : ""}
                          </option>
                        ))}
                      </select>
                      {lineAccountNotSelectable && (
                        <p className="text-[10px] leading-tight text-amber-800">
                          This line uses an inactive, control, or missing account.
                          Choose an active posting account before saving or posting.
                        </p>
                      )}
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        className="h-9 text-xs tabular-nums"
                        value={ln.debit || ""}
                        placeholder="Debit"
                        onChange={(ev) => {
                          const n = parseFloat(ev.target.value) || 0;
                          setLineEdits((prev) =>
                            prev?.map((x, i) =>
                              i === idx ? { ...x, debit: n, credit: 0 } : x
                            ) ?? null
                          );
                        }}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        className="h-9 text-xs tabular-nums"
                        value={ln.credit || ""}
                        placeholder="Credit"
                        onChange={(ev) => {
                          const n = parseFloat(ev.target.value) || 0;
                          setLineEdits((prev) =>
                            prev?.map((x, i) =>
                              i === idx ? { ...x, credit: n, debit: 0 } : x
                            ) ?? null
                          );
                        }}
                      />
                    </div>
                    <div className="col-span-2 flex items-center text-[10px] text-muted-foreground">
                      {accLabel[ln.account_id]?.slice(0, 12)}…
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              className={`mt-3 flex items-center justify-between text-sm ${balanced ? "text-slate-700" : "text-red-600"}`}
            >
              <span className="tabular-nums">
                Debits {totalDebit.toFixed(2)} · Credits {totalCredit.toFixed(2)}
              </span>
              {!balanced && (
                <span className="text-xs">Entry must balance to save</span>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDraftEdit(null);
                  setLineEdits(null);
                }}
                className="transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!balanced || patchMut.isPending}
                onClick={() => void saveDraftLines()}
                className="transition-all duration-200"
              >
                Save lines
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
