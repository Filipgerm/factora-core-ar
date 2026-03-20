"use client";

import { useState } from "react";
import { Mail, Send, SkipForward, Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { MOCK_OVERDUE_INVOICES, type OverdueInvoice } from "@/lib/data/mock-ar-collections";
import { formatCurrency } from "@/lib/utils/format-currency";
import { cn } from "@/lib/utils";

export default function ARCollectionsPage() {
  const [actMode, setActMode] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<OverdueInvoice | null>(null);

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header with Draft/Act Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              AR Collections Agent
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Monitor overdue invoices and send AI-drafted follow-up nudges.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex flex-col">
                <Label
                  htmlFor="ar-mode"
                  className={cn(
                    "text-sm font-medium",
                    actMode ? "text-purple-700" : "text-slate-700"
                  )}
                >
                  {actMode ? "Act Mode" : "Draft Mode"}
                </Label>
                <span className="text-xs text-slate-500">
                  {actMode
                    ? "Agent sends emails autonomously"
                    : "User reviews emails before sending"}
                </span>
              </div>
              <Switch
                id="ar-mode"
                checked={actMode}
                onCheckedChange={setActMode}
                className={actMode ? "data-[state=checked]:bg-primary" : ""}
              />
            </div>
          </div>
        </div>

        {/* Overdue Invoices Pipeline */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 hover:bg-transparent bg-slate-50/50">
                <TableHead className="font-medium text-slate-700">Customer</TableHead>
                <TableHead className="font-medium text-slate-700">Invoice</TableHead>
                <TableHead className="font-medium text-slate-700 text-right">Amount</TableHead>
                <TableHead className="font-medium text-slate-700">Days Overdue</TableHead>
                <TableHead className="font-medium text-slate-700">Last Nudge</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_OVERDUE_INVOICES.map((inv) => (
                <TableRow
                  key={inv.id}
                  className={cn(
                    "border-slate-200 transition-all duration-200 cursor-pointer",
                    "hover:bg-slate-50",
                    selectedInvoice?.id === inv.id && "bg-slate-50"
                  )}
                  onClick={() => setSelectedInvoice(inv)}
                >
                  <TableCell className="font-medium text-slate-900">
                    {inv.customerName}
                  </TableCell>
                  <TableCell className="text-slate-600 font-mono text-sm">
                    {inv.invoiceId}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(inv.amount, "€")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive" className="text-xs">
                      {inv.daysOverdue} days
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {inv.lastNudge ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Empty state when no overdue */}
        {MOCK_OVERDUE_INVOICES.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-xl bg-white">
            <Mail className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-sm font-medium text-slate-700">No overdue invoices</p>
            <p className="text-sm text-slate-500 mt-1">
              All your AR is up to date. Great job!
            </p>
          </div>
        )}

        {/* Email Drawer */}
        <Sheet
          open={!!selectedInvoice}
          onOpenChange={(open) => !open && setSelectedInvoice(null)}
        >
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl p-0 overflow-y-auto"
          >
            {selectedInvoice && (
              <div className="flex flex-col h-full">
                <div className="px-6 pt-6 pb-4 border-b border-slate-200 shrink-0">
                  <SheetHeader>
                    <SheetTitle>AI-Drafted Email</SheetTitle>
                    <SheetDescription>
                      {selectedInvoice.customerName} — {selectedInvoice.invoiceId}
                    </SheetDescription>
                  </SheetHeader>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Subject</Label>
                    <p className="mt-2 text-sm text-slate-900 bg-slate-50 rounded-lg p-3 border border-slate-200">
                      {selectedInvoice.aiDraftedEmail.subject}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Body</Label>
                    <div className="mt-2 text-sm text-slate-900 bg-slate-50 rounded-lg p-4 border border-slate-200 whitespace-pre-wrap">
                      {selectedInvoice.aiDraftedEmail.body}
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-200 flex gap-3 shrink-0">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button size="sm" className="gap-2">
                    <Send className="h-4 w-4" />
                    Send
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => setSelectedInvoice(null)}
                  >
                    <SkipForward className="h-4 w-4" />
                    Skip
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </main>
  );
}
