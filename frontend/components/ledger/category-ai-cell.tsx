"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AiConfidence,
  LedgerCategory,
} from "@/lib/mock-data/dashboard-mocks";
import { LEDGER_CATEGORY_OPTIONS } from "@/lib/mock-data/dashboard-mocks";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function showLearningToast() {
  toast({
    className:
      "border-indigo-100/90 bg-white/95 shadow-lg backdrop-blur-md sm:max-w-[380px]",
    title: (
      <span className="flex items-center gap-2.5">
        <motion.span
          aria-hidden
          className="inline-flex text-indigo-500"
          animate={{ rotate: [0, 12, -8, 5, 0], scale: [1, 1.08, 1] }}
          transition={{
            duration: 0.55,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <Sparkles className="size-4 shrink-0" />
        </motion.span>
        <span className="font-semibold tracking-tight">Feedback saved.</span>
      </span>
    ),
    description:
      "The AI model is learning from your categorization.",
  });
}

interface CategoryAiCellProps {
  invoiceId: string;
  suggestedCategory: LedgerCategory;
  aiConfidence: AiConfidence;
  /** User-confirmed category for low-confidence rows */
  verifiedCategory: LedgerCategory | undefined;
  onCategoryVerified: (invoiceId: string, category: LedgerCategory) => void;
}

export function CategoryAiCell({
  invoiceId,
  suggestedCategory,
  aiConfidence,
  verifiedCategory,
  onCategoryVerified,
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
    return (
      <div className="rounded-xl border border-border/30 bg-indigo-50/25 p-2.5 dark:border-indigo-950/35 dark:bg-indigo-950/20">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium tracking-tight text-foreground">
            {suggestedCategory}
          </span>
          <Badge variant="aiMedium" className="transition-all duration-300 ease-out">
            Medium
          </Badge>
        </div>
      </div>
    );
  }

  const displayCategory = verifiedCategory ?? suggestedCategory;
  const needsVerification = !verifiedCategory;

  return (
    <div
      className={cn(
        "max-w-[260px] rounded-xl border border-border/25 bg-muted/10 p-2 transition-all duration-300 ease-out",
        needsVerification &&
          "ring-2 ring-indigo-200/60 dark:ring-indigo-900/45"
      )}
    >
      <p className="mb-1.5 text-xs text-muted-foreground">
        AI suggests{" "}
        <span className="font-medium text-foreground">{suggestedCategory}</span>
      </p>
      <Select
        value={verifiedCategory}
        onValueChange={(v) => {
          const next = v as LedgerCategory;
          onCategoryVerified(invoiceId, next);
          showLearningToast();
        }}
      >
        <SelectTrigger
          size="sm"
          className="h-8 w-full min-w-[176px] transition-all duration-300 ease-out"
        >
          <SelectValue placeholder="Verify category" />
        </SelectTrigger>
        <SelectContent align="start">
          {LEDGER_CATEGORY_OPTIONS.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {verifiedCategory ? (
        <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          Booked as {displayCategory}
        </p>
      ) : null}
    </div>
  );
}
