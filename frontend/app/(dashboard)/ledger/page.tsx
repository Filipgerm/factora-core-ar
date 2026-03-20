"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MOCK_LEDGER_COUNTERPARTIES,
  CATEGORY_OPTIONS,
  type LedgerCounterparty,
} from "@/lib/data/mock-ledger";
import { formatCurrency } from "@/lib/utils/format-currency";
import { cn } from "@/lib/utils";

function AiConfidenceBadge({ confidence }: { confidence: LedgerCounterparty["aiConfidence"] }) {
  const config = {
    high: { variant: "aiHigh" as const, label: "High" },
    medium: { variant: "aiMedium" as const, label: "Medium" },
    low: { variant: "aiLow" as const, label: "Low" },
  };
  const { variant, label } = config[confidence];
  return (
    <Badge variant={variant} className="gap-1">
      <Sparkles className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function GemiBadge({ verified }: { verified: boolean | null }) {
  if (verified === null) return null;
  return (
    <Badge variant={verified ? "gemiVerified" : "gemiPending"}>
      {verified ? "GEMI Verified" : "Pending"}
    </Badge>
  );
}

function CategoryCell({ row }: { row: LedgerCounterparty }) {
  const [category, setCategory] = useState(row.category);

  if (row.aiConfidence === "high" && row.category) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">{row.category}</span>
        <Badge variant="aiHigh" className="text-[10px] px-1.5 py-0">
          AI-Suggested
        </Badge>
      </div>
    );
  }

  if (row.aiConfidence === "low") {
    return (
      <Select value={category || "__none__"} onValueChange={(v) => setCategory(v === "__none__" ? "" : v)}>
        <SelectTrigger className="h-8 w-[160px] border-amber-200 bg-amber-50/50">
          <SelectValue placeholder="Verify Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__" disabled>
            Verify Category
          </SelectItem>
          {CATEGORY_OPTIONS.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{category || "—"}</span>
      {row.category && (
        <Badge variant="aiMedium" className="text-[10px] px-1.5 py-0">
          AI-Suggested
        </Badge>
      )}
    </div>
  );
}

export default function LedgerPage() {
  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-1 mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Smart Ledger & Counterparties
          </h1>
          <p className="text-sm text-slate-500">
            Counterparties and recent parsed invoices with AI-powered categorization.
          </p>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="font-medium text-slate-700">Counterparty</TableHead>
                <TableHead className="font-medium text-slate-700">Type</TableHead>
                <TableHead className="font-medium text-slate-700">VAT</TableHead>
                <TableHead className="font-medium text-slate-700">Country</TableHead>
                <TableHead className="font-medium text-slate-700">Recent Invoices</TableHead>
                <TableHead className="font-medium text-slate-700">Category</TableHead>
                <TableHead className="font-medium text-slate-700">AI Confidence</TableHead>
                <TableHead className="font-medium text-slate-700">GEMI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_LEDGER_COUNTERPARTIES.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "border-slate-200 transition-all duration-200",
                    "hover:bg-slate-50"
                  )}
                >
                  <TableCell className="font-medium text-slate-900">
                    {row.name}
                  </TableCell>
                  <TableCell className="text-slate-600 capitalize">
                    {row.type}
                  </TableCell>
                  <TableCell className="text-slate-600 font-mono text-xs">
                    {row.vatNumber ?? "—"}
                  </TableCell>
                  <TableCell className="text-slate-600">{row.country}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      {row.recentInvoices.slice(0, 2).map((inv) => (
                        <span key={inv.id} className="text-sm">
                          {inv.id}: {formatCurrency(inv.amount, "€")}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <CategoryCell row={row} />
                  </TableCell>
                  <TableCell>
                    <AiConfidenceBadge confidence={row.aiConfidence} />
                  </TableCell>
                  <TableCell>
                    <GemiBadge verified={row.gemiVerified} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </main>
  );
}
