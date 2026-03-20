"use client";

import type { ComponentType } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  BadgeCheck,
  Banknote,
  Building2,
  FileText,
  GitMerge,
  Mail,
  Sparkles,
} from "lucide-react";

import type { HomeActivityIcon, HomeActivityItem } from "@/lib/mock-data/dashboard-mocks";
import { mockHomeActivityFeed } from "@/lib/mock-data/dashboard-mocks";
import { cn } from "@/lib/utils";

const ACTIVITY_ICONS: Record<
  HomeActivityIcon,
  ComponentType<{ className?: string }>
> = {
  sparkles: Sparkles,
  "git-merge": GitMerge,
  building: Building2,
  "file-text": FileText,
  mail: Mail,
  "badge-check": BadgeCheck,
  banknote: Banknote,
};

interface RecentActivityFeedProps {
  items?: HomeActivityItem[];
  className?: string;
}

export function RecentActivityFeed({
  items = mockHomeActivityFeed,
  className,
}: RecentActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border-2 border-dashed border-slate-200 bg-card/40 px-5 py-12 text-center dark:border-slate-700",
          className
        )}
      >
        <p className="text-sm font-medium text-foreground">No recent activity</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Agent and user actions will appear here in chronological order.
        </p>
      </div>
    );
  }

  const sorted = [...items].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );

  return (
    <section
      className={cn(
        "flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50/40 shadow-sm dark:border-slate-800 dark:bg-slate-900/25",
        className
      )}
    >
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recent activity
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          AI and user events across your workspace.
        </p>
      </div>
      <ul className="max-h-[min(520px,55vh)] flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
        {sorted.map((item) => {
          const Icon = ACTIVITY_ICONS[item.icon];
          return (
            <li key={item.id}>
              <div className="flex gap-3 px-5 py-3.5 transition-all duration-200 hover:bg-card">
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-card text-[var(--brand-primary)] shadow-xs dark:border-slate-700"
                  aria-hidden
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-foreground">{item.message}</p>
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                    {formatDistanceToNow(new Date(item.at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
