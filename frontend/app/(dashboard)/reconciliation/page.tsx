"use client";

import { useState } from "react";
import {
  Bot,
  CheckCircle2,
  AlertCircle,
  Filter,
  Landmark,
  Sparkles,
} from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MOCK_RECONCILIATION_MATCHES,
  MOCK_ACCOUNTS,
  type ReconciliationMatch,
} from "@/lib/data/mock-reconciliation";
import { formatCurrency } from "@/lib/utils/format-currency";
import { cn } from "@/lib/utils";

const AI_CONFIDENCE_FILTERS = [
  { id: "all", label: "All" },
  { id: "high", label: "High", dot: "bg-violet-500" },
  { id: "medium", label: "Medium", dot: "bg-amber-500" },
  { id: "rule", label: "Rule", icon: "rule" },
  { id: "none", label: "No suggestion" },
];

function AiConfidenceBadge({ confidence }: { confidence: ReconciliationMatch["aiConfidence"] }) {
  const config: Record<string, { variant: "aiHigh" | "aiMedium" | "aiLow"; label: string }> = {
    high: { variant: "aiHigh", label: "High" },
    medium: { variant: "aiMedium", label: "Medium" },
    low: { variant: "aiLow", label: "Low" },
    rule: { variant: "aiLow", label: "Rule" },
    none: { variant: "aiLow", label: "No suggestion" },
  };
  const { variant, label } = config[confidence] ?? config.none;
  return (
    <Badge variant={variant} className="gap-1">
      <Sparkles className="h-3 w-3" />
      {label}
    </Badge>
  );
}

export default function ReconciliationPage() {
  const [view, setView] = useState<"needs_review" | "matched">("needs_review");
  const [selectedMatch, setSelectedMatch] = useState<ReconciliationMatch | null>(null);
  const [accountFilter, setAccountFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");

  const needsReview = MOCK_RECONCILIATION_MATCHES.filter((m) => m.matchStatus === "needs_review");
  const matched = MOCK_RECONCILIATION_MATCHES.filter((m) => m.matchStatus === "matched");
  const displayMatches = view === "needs_review" ? needsReview : matched;

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Cash Reconciliation
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="gap-1">
                <Bot className="h-3 w-3" />
                {matched.length} Auto-matched transactions
              </Badge>
            </div>
          </div>
        </div>

        {/* View toggles & Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              onClick={() => setView("needs_review")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                view === "needs_review"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <AlertCircle className="h-4 w-4" />
              Action needed ({needsReview.length})
            </button>
            <button
              onClick={() => setView("matched")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                view === "matched"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <CheckCircle2 className="h-4 w-4" />
              Matched ({matched.length})
            </button>
          </div>

          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Account" />
            </SelectTrigger>
            <SelectContent>
              {MOCK_ACCOUNTS.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            {AI_CONFIDENCE_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setConfidenceFilter(f.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                  confidenceFilter === f.id
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-500 hover:bg-slate-50"
                )}
              >
                {f.dot && <span className={cn("h-1.5 w-1.5 rounded-full", f.dot)} />}
                {f.label}
              </button>
            ))}
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Split-pane Table: Bank | Factora */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 hover:bg-transparent bg-slate-50/50">
                <TableHead className="w-8" />
                <TableHead className="font-medium text-slate-700">Date</TableHead>
                <TableHead className="font-medium text-slate-700">Payer</TableHead>
                <TableHead className="font-medium text-slate-700">Account</TableHead>
                <TableHead className="font-medium text-slate-700">Entity</TableHead>
                <TableHead className="font-medium text-slate-700 text-right">Amount</TableHead>
                <TableHead className="w-px bg-slate-200" />
                <TableHead className="font-medium text-slate-700">Type</TableHead>
                <TableHead className="font-medium text-slate-700">Vendor/Customer</TableHead>
                <TableHead className="font-medium text-slate-700">GL Account</TableHead>
                <TableHead className="font-medium text-slate-700 text-right">Amount</TableHead>
                <TableHead className="font-medium text-slate-700">AI Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayMatches.map((match) => (
                <TableRow
                  key={match.id}
                  className={cn(
                    "border-slate-200 transition-all duration-200",
                    match.matchStatus === "needs_review" && "cursor-pointer hover:bg-amber-50/50",
                    selectedMatch?.id === match.id && "bg-amber-50/50"
                  )}
                  onClick={() =>
                    match.matchStatus === "needs_review" && setSelectedMatch(match)
                  }
                >
                  <TableCell className="w-8">
                    {match.matchStatus === "matched" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <div className="w-4" />
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">
                    {match.bankTransaction.date}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-900">
                        {match.bankTransaction.payer}
                      </p>
                      {match.bankTransaction.payerSubtext && (
                        <p className="text-xs text-slate-500">
                          {match.bankTransaction.payerSubtext}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    <span className="flex items-center gap-1">
                      <Landmark className="h-3 w-3" />
                      ****{match.bankTransaction.accountLast4}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {match.bankTransaction.entity}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium tabular-nums",
                      match.bankTransaction.amount >= 0
                        ? "text-emerald-600"
                        : "text-slate-900"
                    )}
                  >
                    {formatCurrency(
                      Math.abs(match.bankTransaction.amount) *
                        (match.bankTransaction.amount >= 0 ? 1 : -1),
                      "$"
                    )}
                  </TableCell>
                  <TableCell className="w-px bg-slate-200" />
                  <TableCell className="text-slate-600">
                    {match.vendorCustomer ? "Invoice" : "—"}
                  </TableCell>
                  <TableCell>
                    {match.vendorCustomer ? (
                      <div>
                        <p className="font-medium text-slate-900">
                          {match.vendorCustomer}
                        </p>
                        {match.vendorCustomerSubtext && (
                          <p className="text-xs text-slate-500">
                            {match.vendorCustomerSubtext}
                          </p>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {match.glAccount ? (
                      <span>
                        {match.glAccount} - {match.glAccountName}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {match.amount != null ? (
                      <div>
                        <span className="text-slate-900">
                          {formatCurrency(match.amount, "$")}
                        </span>
                        {match.partialAmount != null &&
                          match.partialAmount !== match.amount && (
                            <span className="block text-xs text-red-600">
                              {formatCurrency(match.partialAmount, "$")}
                            </span>
                          )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <AiConfidenceBadge confidence={match.aiConfidence} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Needs Review Side Panel */}
        <Sheet
          open={!!selectedMatch}
          onOpenChange={(open) => !open && setSelectedMatch(null)}
        >
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl p-0 overflow-y-auto"
          >
            {selectedMatch && (
              <div className="space-y-6">
                <div className="px-6 pt-6 pb-4 border-b border-slate-200">
                  <SheetHeader>
                    <SheetTitle>Review Match</SheetTitle>
                    <SheetDescription>
                      {selectedMatch.bankTransaction.payer} —{" "}
                      {formatCurrency(
                        Math.abs(selectedMatch.bankTransaction.amount),
                        "$"
                      )}
                    </SheetDescription>
                  </SheetHeader>
                </div>
                <div className="px-6 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">
                      AI Reasoning
                    </h4>
                    <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-4 border border-slate-200">
                      {selectedMatch.aiReasoning ??
                        "No reasoning provided."}
                    </p>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => setSelectedMatch(null)}
                      className="flex-1"
                    >
                      Confirm
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedMatch(null)}
                      className="flex-1"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </main>
  );
}
