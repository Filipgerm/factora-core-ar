"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { LedgerCategory } from "@/lib/mock-data/dashboard-mocks";
import { LEDGER_CATEGORY_OPTIONS } from "@/lib/mock-data/dashboard-mocks";
import { toast as pushToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function showLearningToast() {
  pushToast({
    className:
      "border-indigo-100/90 bg-white/95 shadow-lg backdrop-blur-md sm:max-w-[380px]",
    title: "Feedback saved.",
    description:
      "The AI model is learning from your categorization.",
  });
}

interface LedgerCategoryComboboxProps {
  invoiceId: string;
  suggestedCategory: LedgerCategory;
  verifiedCategory: LedgerCategory | undefined;
  tabStop?: boolean;
  emphasis: "medium" | "low";
  onCategoryVerified: (invoiceId: string, category: LedgerCategory) => void;
}

export function LedgerCategoryCombobox({
  invoiceId,
  suggestedCategory,
  verifiedCategory,
  tabStop = true,
  emphasis,
  onCategoryVerified,
}: LedgerCategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LEDGER_CATEGORY_OPTIONS;
    return LEDGER_CATEGORY_OPTIONS.filter((c) =>
      c.toLowerCase().includes(q)
    );
  }, [query]);

  const [highlight, setHighlight] = useState(0);
  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  const selectCategory = useCallback(
    (c: LedgerCategory) => {
      onCategoryVerified(invoiceId, c);
      showLearningToast();
      setOpen(false);
      setQuery("");
    },
    [invoiceId, onCategoryVerified]
  );

  const displayCategory = verifiedCategory ?? suggestedCategory;
  const needsVerification = !verifiedCategory;

  const shell =
    emphasis === "medium"
      ? "rounded-xl border border-border/30 bg-indigo-50/25 p-2.5 dark:border-indigo-950/35 dark:bg-indigo-950/20"
      : "max-w-[260px] rounded-xl border border-border/25 bg-muted/10 p-2";

  return (
    <div
      className={cn(
        shell,
        "transition-all duration-300 ease-out",
        needsVerification &&
          emphasis === "low" &&
          "ring-2 ring-indigo-200/60 dark:ring-indigo-900/45"
      )}
    >
      <p className="mb-1.5 text-xs text-muted-foreground">
        AI suggests{" "}
        <span className="font-medium text-foreground">{suggestedCategory}</span>
      </p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={`ledger-cat-${invoiceId}`}
            type="button"
            variant="outline"
            size="sm"
            tabIndex={tabStop ? 0 : -1}
            className="h-8 w-full min-w-[176px] justify-between gap-2 text-left font-normal transition-all duration-300 ease-out"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !open && needsVerification) {
                e.preventDefault();
                setOpen(true);
                requestAnimationFrame(() => inputRef.current?.focus());
              }
            }}
          >
            <span className="min-w-0 truncate">
              {verifiedCategory ? (
                displayCategory
              ) : (
                <span className="text-muted-foreground">Verify category</span>
              )}
            </span>
            <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="border-b border-slate-100 p-2 dark:border-slate-800">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to filter…"
              className="h-8 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlight((h) =>
                    Math.min(h + 1, Math.max(filtered.length - 1, 0))
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight((h) => Math.max(h - 1, 0));
                } else if (e.key === "Enter" && filtered[highlight]) {
                  e.preventDefault();
                  selectCategory(filtered[highlight] as LedgerCategory);
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1" role="listbox">
            {filtered.map((c, i) => (
              <li key={c} role="option" aria-selected={i === highlight}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full px-3 py-2 text-left text-xs transition-colors",
                    i === highlight
                      ? "bg-slate-100 dark:bg-slate-800"
                      : "hover:bg-slate-50 dark:hover:bg-slate-900"
                  )}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => selectCategory(c as LedgerCategory)}
                >
                  {c}
                </button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
      {verifiedCategory ? (
        <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          Booked as {displayCategory}
        </p>
      ) : (
        <p className="mt-1 text-[10px] text-muted-foreground">
          Tab to focus, Enter to open, type to filter, Enter to approve.
        </p>
      )}
    </div>
  );
}
