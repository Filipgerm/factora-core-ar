"use client";

import { useMemo } from "react";
import { FileText, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useGlAccountsQuery,
  useGlJournalAuditQuery,
  useGlJournalEntryQuery,
} from "@/lib/hooks/api/use-general-ledger";
import { formatLedgerMoney } from "@/components/features/general-ledger/gl-money";
import { useLedgerView } from "@/components/features/general-ledger/ledger-view-context";

type Props = {
  entryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function JournalEntryInspectorSheet({
  entryId,
  open,
  onOpenChange,
}: Props) {
  const { displayCurrency } = useLedgerView();
  const { data: entry, isLoading } = useGlJournalEntryQuery(
    open ? entryId : null
  );
  const { data: audit = [] } = useGlJournalAuditQuery(open ? entryId : null);
  const { data: accounts = [] } = useGlAccountsQuery();

  const accMap = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])),
    [accounts]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col border-l border-slate-100 p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 space-y-1 border-b border-slate-100 px-6 py-5 text-left">
          <SheetTitle className="text-lg font-semibold tracking-tight">
            Journal entry
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Line items and immutable audit timeline.
          </SheetDescription>
        </SheetHeader>
        <Tabs defaultValue="details" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-6 mt-3 grid w-auto grid-cols-2">
            <TabsTrigger
              value="details"
              className="gap-1.5 text-xs transition-all duration-200"
            >
              <FileText className="size-3.5" aria-hidden />
              Details
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="gap-1.5 text-xs transition-all duration-200"
            >
              <History className="size-3.5" aria-hidden />
              History
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="details"
            className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
          >
            <div className="max-h-[55vh] flex-1 overflow-y-auto px-6 py-4">
              {isLoading && (
                <div className="space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                  <div className="h-24 animate-pulse rounded bg-slate-100" />
                </div>
              )}
              {entry && (
                <div className="space-y-4">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Status:</span>{" "}
                    {entry.status}
                    {entry.reference && (
                      <>
                        {" "}
                        · <span className="font-medium">Ref:</span>{" "}
                        {entry.reference}
                      </>
                    )}
                  </div>
                  {entry.memo && (
                    <p className="text-sm text-foreground/90">{entry.memo}</p>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-100 hover:bg-transparent">
                        <TableHead className="text-xs">Account</TableHead>
                        <TableHead className="text-right text-xs">
                          Debit
                        </TableHead>
                        <TableHead className="text-right text-xs">
                          Credit
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entry.lines.map((ln) => {
                        const a = accMap[ln.account_id];
                        return (
                          <TableRow
                            key={ln.id}
                            className="border-slate-100 transition-colors duration-200 hover:bg-slate-50/80"
                          >
                            <TableCell className="text-xs">
                              <span className="font-medium">{a?.code}</span>{" "}
                              <span className="text-muted-foreground">
                                {a?.name}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-xs tabular-nums">
                              {ln.debit > 0
                                ? formatLedgerMoney(
                                    ln.debit,
                                    entry.document_currency
                                  )
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right text-xs tabular-nums">
                              {ln.credit > 0
                                ? formatLedgerMoney(
                                    ln.credit,
                                    entry.document_currency
                                  )
                                : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="flex justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="text-muted-foreground">Totals</span>
                    <span className="tabular-nums text-foreground">
                      D{" "}
                      {formatLedgerMoney(
                        entry.total_debit,
                        entry.document_currency
                      )}{" "}
                      · C{" "}
                      {formatLedgerMoney(
                        entry.total_credit,
                        entry.document_currency
                      )}
                    </span>
                  </div>
                  {entry.fx_rate_to_base != null && (
                    <p className="text-xs text-muted-foreground">
                      FX to {entry.base_currency}: {entry.fx_rate_to_base} ·
                      Display ({displayCurrency}) is cosmetic in this demo.
                    </p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent
            value="history"
            className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
          >
            <div className="max-h-[55vh] flex-1 overflow-y-auto px-6 py-4">
              <ul className="space-y-3">
                {audit.length === 0 && (
                  <li className="text-xs text-muted-foreground">
                    No audit events.
                  </li>
                )}
                {audit.map((ev) => (
                  <li
                    key={ev.id}
                    className="border-l-2 border-purple-200 pl-3 text-xs transition-all duration-200"
                  >
                    <div className="font-medium text-foreground">
                      {ev.action.replace(/_/g, " ")}
                    </div>
                    <div className="text-muted-foreground">
                      {new Date(ev.created_at).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>
        </Tabs>
        <div className="shrink-0 border-t border-slate-100 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="w-full transition-all duration-200"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
