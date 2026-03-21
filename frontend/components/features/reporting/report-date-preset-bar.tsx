"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

const PRESETS = ["YTD", "Last Month", "Q3", "Trailing 12M"] as const;

export type ReportDatePreset = (typeof PRESETS)[number];

export function ReportDatePresetBar({ className }: { className?: string }) {
  const [active, setActive] = useState<ReportDatePreset>("YTD");

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="group"
      aria-label="Reporting period"
    >
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Period
      </span>
      {PRESETS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => setActive(p)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-semibold tracking-tight transition-all duration-200",
            active === p
              ? "border-slate-900 bg-slate-50 text-foreground shadow-sm dark:border-slate-200 dark:bg-slate-900 dark:text-slate-100"
              : "border-slate-200/90 bg-white text-muted-foreground hover:border-slate-300 hover:text-foreground dark:border-slate-700 dark:bg-background dark:hover:border-slate-600"
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
