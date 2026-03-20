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
          "rounded-2xl border-2 border-dashed border-border/50 bg-muted/5 px-8 py-14 text-center",
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
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex h-full max-h-[min(40vh,340px)] flex-col overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-b from-card via-card to-muted/15 shadow-sm lg:max-h-[min(36vh,300px)] dark:to-muted/10",
        className
      )}
    >
      <div className="shrink-0 border-b border-border/40 bg-background/50 px-6 py-5 backdrop-blur-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recent activity
        </h2>
        <p className="mt-0.5 text-[11px] leading-snug tracking-tight text-muted-foreground">
          AI and user events.
        </p>
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-border/30 overflow-y-auto">
        {sorted.map((item, i) => {
          const Icon = ACTIVITY_ICONS[item.icon];
          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.35 + i * 0.04,
                duration: 0.35,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="flex gap-3 px-4 py-3.5 transition-all duration-300 ease-out hover:bg-muted/50">
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-card text-[var(--brand-primary)] shadow-xs"
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
