"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface MockLedgerLine {
  id: string;
  date: string;
  description: string;
  debit: number | null;
  credit: number | null;
}

const FALLBACK_LINES: MockLedgerLine[] = [
  {
    id: "ml-1",
    date: "15/11/2025",
    description: "Recognized revenue — subscription",
    debit: null,
    credit: 42_800,
  },
  {
    id: "ml-2",
    date: "15/11/2025",
    description: "AR clearance",
    debit: 42_800,
    credit: null,
  },
];

function formatCell(n: number | null) {
  if (n === null) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n);
}

export function TransactionDetailSheet({
  open,
  onOpenChange,
  title = "Transaction detail",
  lines = FALLBACK_LINES,
  contextLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  lines?: MockLedgerLine[];
  contextLabel?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l border-slate-200 bg-white p-0 sm:max-w-md dark:border-slate-800 dark:bg-background"
      >
        <SheetHeader className="border-b border-slate-100 px-6 py-5 text-left dark:border-slate-800">
          <SheetTitle className="text-lg font-semibold tracking-tight">
            {title}
          </SheetTitle>
          <SheetDescription className="text-xs tracking-tight text-muted-foreground">
            {contextLabel ??
              "Mock ledger postings behind this balance (demo)."}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:border-slate-800">
                <th className="py-2 pr-2">Date</th>
                <th className="py-2 pr-2">Description</th>
                <th className="py-2 text-right">Debit</th>
                <th className="py-2 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 dark:border-slate-800/80"
                >
                  <td className="py-2.5 pr-2 font-mono text-xs tabular-nums text-muted-foreground">
                    {row.date}
                  </td>
                  <td className="max-w-[200px] py-2.5 pr-2 text-xs leading-snug text-foreground">
                    {row.description}
                  </td>
                  <td
                    className={cn(
                      "py-2.5 text-right font-mono text-xs tabular-nums",
                      row.debit != null && "font-medium text-foreground"
                    )}
                  >
                    {formatCell(row.debit)}
                  </td>
                  <td
                    className={cn(
                      "py-2.5 text-right font-mono text-xs tabular-nums",
                      row.credit != null && "font-medium text-foreground"
                    )}
                  >
                    {formatCell(row.credit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SheetContent>
    </Sheet>
  );
}
