"use client";

import type { ComponentType } from "react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
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

const SNAP_SPRING = { type: "spring" as const, stiffness: 640, damping: 44 };

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
          "rounded-2xl border border-dashed border-slate-200 bg-white px-8 py-14 text-center shadow-sm",
          className
        )}
      >
        <p className="text-sm font-medium tracking-tight text-foreground">
          No recent activity
        </p>
        <p className="mt-1 text-xs tracking-tight text-muted-foreground">
          Agent and user actions will appear here in chronological order.
        </p>
      </div>
    );
  }

  const sorted = [...items].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SNAP_SPRING, delay: 0.16 }}
      className={cn(
        "flex h-full max-h-[min(40vh,340px)] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-14px_rgba(15,23,42,0.08)] lg:max-h-[min(36vh,300px)]",
        className
      )}
    >
      <div className="shrink-0 border-b border-slate-100 bg-slate-50/50 px-6 py-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recent activity
        </h2>
        <p className="mt-0.5 text-[11px] leading-snug tracking-tight text-muted-foreground">
          AI and user events.
        </p>
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
        {sorted.map((item, i) => {
          const Icon = ACTIVITY_ICONS[item.icon];
          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                ...SNAP_SPRING,
                delay: 0.2 + i * 0.028,
              }}
            >
              <div className="flex gap-3 px-4 py-3 transition-all duration-200 ease-out hover:bg-slate-50/90">
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-white text-[var(--brand-primary)] shadow-sm"
                  aria-hidden
                >
                  <Icon className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-snug tracking-tight text-foreground">
                    {item.message}
                  </p>
                  <p className="mt-1 text-[11px] tabular-nums tracking-tight text-muted-foreground">
                    {formatDistanceToNow(new Date(item.at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </motion.section>
  );
}
