"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { HomeActionItem } from "@/lib/mock-data/dashboard-mocks";
import { mockHomeActionItems } from "@/lib/mock-data/dashboard-mocks";
import { cn } from "@/lib/utils";

function urgencyStyles(urgency: HomeActionItem["urgency"]) {
  switch (urgency) {
    case "critical":
      return {
        border: "border-l-destructive",
        hover:
          "hover:border-destructive/40 hover:bg-destructive/[0.04] hover:shadow-sm",
      };
    case "attention":
      return {
        border: "border-l-[var(--brand-primary)]",
        hover:
          "hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)]/45 hover:shadow-sm",
      };
    default:
      return {
        border: "border-l-slate-200 dark:border-l-slate-700",
        hover:
          "hover:border-l-slate-400 hover:bg-slate-50/90 hover:shadow-sm dark:hover:bg-slate-900/40",
      };
  }
}

interface ActionItemsListProps {
  items?: HomeActionItem[];
}

export function ActionItemsList({ items = mockHomeActionItems }: ActionItemsListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-200 bg-card/40 px-6 py-10 text-center transition-all duration-200 dark:border-slate-700">
        <p className="text-sm font-medium text-foreground">All clear</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No open action items — agents will surface new tasks here.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-card shadow-sm transition-all duration-200 dark:border-slate-800">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Needs your attention
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          AI-surfaced tasks — click to jump to the right workspace.
        </p>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((item) => {
          const u = urgencyStyles(item.urgency);
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={cn(
                  "group flex items-center gap-4 border-l-4 bg-transparent px-5 py-3.5 transition-all duration-200",
                  u.border,
                  u.hover
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground transition-colors duration-200 group-hover:text-[var(--brand-primary)]">
                    {item.label}
                  </p>
                </div>
                <span className="flex items-center gap-2 tabular-nums">
                  <span className="text-lg font-semibold tracking-tight text-foreground">
                    {item.count}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
