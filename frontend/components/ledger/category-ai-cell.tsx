"use client";

import { Sparkles } from "lucide-react";

import { LedgerCategoryCombobox } from "@/components/ledger/ledger-category-combobox";
import { Badge } from "@/components/ui/badge";
import type {
  AiConfidence,
  LedgerCategory,
} from "@/lib/mock-data/dashboard-mocks";
import { cn } from "@/lib/utils";

interface CategoryAiCellProps {
  invoiceId: string;
  suggestedCategory: LedgerCategory;
  aiConfidence: AiConfidence;
  verifiedCategory: LedgerCategory | undefined;
  onCategoryVerified: (invoiceId: string, category: LedgerCategory) => void;
  /** Roving tabindex for keyboard-first review (<95% confidence rows). */
  categoryTabStop?: boolean;
}

export function CategoryAiCell({
  invoiceId,
  suggestedCategory,
  aiConfidence,
  verifiedCategory,
  onCategoryVerified,
  categoryTabStop = true,
}: CategoryAiCellProps) {
  if (aiConfidence === "high") {
    return (
      <div className="rounded-xl border border-border/30 bg-indigo-50/35 p-2.5 dark:border-indigo-950/40 dark:bg-indigo-950/25">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium tracking-tight text-foreground">
            {suggestedCategory}
          </span>
          <Badge
            variant="aiHigh"
            className="gap-1 transition-all duration-300 ease-out"
          >
            <Sparkles className="size-3" aria-hidden />
            AI-Suggested
          </Badge>
        </div>
      </div>
    );
  }

  if (aiConfidence === "medium") {
    if (verifiedCategory) {
      return (
        <div className="rounded-xl border border-border/30 bg-indigo-50/25 p-2.5 dark:border-indigo-950/35 dark:bg-indigo-950/20">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium tracking-tight text-foreground">
              {verifiedCategory}
            </span>
            <Badge variant="aiMedium" className="transition-all duration-300 ease-out">
              Medium
            </Badge>
          </div>
          <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Booked as {verifiedCategory}
          </p>
        </div>
      );
    }
    return (
      <LedgerCategoryCombobox
        invoiceId={invoiceId}
        suggestedCategory={suggestedCategory}
        verifiedCategory={verifiedCategory}
        emphasis="medium"
        tabStop={categoryTabStop}
        onCategoryVerified={onCategoryVerified}
      />
    );
  }

  if (verifiedCategory) {
    return (
      <div
        className={cn(
          "max-w-[260px] rounded-xl border border-border/25 bg-muted/10 p-2"
        )}
      >
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
          Booked as {verifiedCategory}
        </p>
      </div>
    );
  }

  return (
    <LedgerCategoryCombobox
      invoiceId={invoiceId}
      suggestedCategory={suggestedCategory}
      verifiedCategory={verifiedCategory}
      emphasis="low"
      tabStop={categoryTabStop}
      onCategoryVerified={onCategoryVerified}
    />
  );
}
