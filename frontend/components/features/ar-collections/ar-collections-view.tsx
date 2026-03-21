"use client";

import { useCallback, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Mail, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type { MockArOverdueInvoice } from "@/lib/mock-data/dashboard-mocks";
import { mockArOverdueInvoices } from "@/lib/mock-data/dashboard-mocks";
import { cn } from "@/lib/utils";

function formatMoneyEUR(value: number) {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

function buildDraft(inv: MockArOverdueInvoice) {
  const due = format(parseISO(inv.dueDate), "MMM d, yyyy");
  return `Hi ${inv.contactFirstName},

Just a friendly reminder that invoice ${inv.invoiceNumber} for ${formatMoneyEUR(inv.amount)} was due on ${due}. If you've already sent payment, please disregard this note — otherwise we'd appreciate settling at your earliest convenience.

Thank you,
Factora AR`;
}

export function ArCollectionsView() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<MockArOverdueInvoice | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  const rows = useMemo(() => mockArOverdueInvoices, []);

  const openFor = useCallback((inv: MockArOverdueInvoice) => {
    setActive(inv);
    setDraft(buildDraft(inv));
    setEditing(false);
    setOpen(true);
  }, []);

  const onSend = useCallback(() => {
    toast({
      title: "Nudge queued",
      description: active
        ? `Follow-up scheduled for ${active.customerLegalName}.`
        : undefined,
    });
    setOpen(false);
    setActive(null);
  }, [active, toast]);

  return (
    <>
      <Card className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-background">
        <CardHeader className="border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <CardTitle className="text-lg font-semibold tracking-tight">
            AR collections
          </CardTitle>
          <CardDescription className="text-sm tracking-tight">
            Overdue receivables — preview AI-drafted nudges before anything is
            sent.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 bg-slate-50/80 hover:bg-transparent dark:border-slate-800">
                <TableHead className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Customer
                </TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Invoice
                </TableHead>
                <TableHead className="text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Amount
                </TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Due
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((inv) => (
                <TableRow
                  key={inv.id}
                  className={cn(
                    "cursor-pointer border-slate-100 transition-colors duration-200 hover:bg-slate-50/90 dark:border-slate-800 dark:hover:bg-slate-900/40"
                  )}
                  onClick={() => openFor(inv)}
                >
                  <TableCell className="max-w-[220px] font-medium tracking-tight">
                    {inv.customerLegalName}
                  </TableCell>
                  <TableCell className="font-mono text-sm tabular-nums text-muted-foreground">
                    {inv.invoiceNumber}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">
                    {formatMoneyEUR(inv.amount)}
                  </TableCell>
                  <TableCell className="font-mono text-sm tabular-nums text-muted-foreground">
                    {format(parseISO(inv.dueDate), "d MMM yyyy")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 border-l border-slate-200 p-0 sm:max-w-lg dark:border-slate-800"
        >
          <SheetHeader className="border-b border-slate-100 px-6 py-5 text-left dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg border border-violet-200/60 bg-violet-50/90 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-200">
                <Sparkles className="size-4" aria-hidden />
              </div>
              <div>
                <SheetTitle className="text-lg font-semibold tracking-tight">
                  AI drafted email
                </SheetTitle>
                {active ? (
                  <SheetDescription className="text-xs tracking-tight">
                    {active.invoiceNumber} · {active.customerLegalName}
                  </SheetDescription>
                ) : null}
              </div>
            </div>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Message
              </Label>
              {editing ? (
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="min-h-[220px] resize-y text-sm leading-relaxed"
                />
              ) : (
                <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground dark:border-slate-800 dark:bg-slate-900/30">
                  {draft}
                </div>
              )}
            </div>
            <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg transition-all duration-200"
                onClick={() => setEditing((e) => !e)}
              >
                {editing ? "Done" : "Edit"}
              </Button>
              <Button
                type="button"
                className="rounded-lg transition-all duration-200"
                onClick={onSend}
              >
                <Mail className="mr-2 size-4" aria-hidden />
                Send nudge
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
