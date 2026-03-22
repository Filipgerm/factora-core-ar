"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

import type { HomeActionItem } from "@/lib/mock-data/dashboard-mocks";
import { mockHomeActionItems } from "@/lib/mock-data/dashboard-mocks";
import { cn } from "@/lib/utils";

const SNAP_SPRING = { type: "spring" as const, stiffness: 640, damping: 44 };

function urgencyStyles(urgency: HomeActionItem["urgency"]) {
  switch (urgency) {
    case "critical":
      return {
        inner: "border-l-destructive",
      };
    case "attention":
      return {
        inner: "border-l-[var(--brand-primary)]",
      };
    default:
      return {
        inner: "border-l-slate-200",
      };
  }
}

function AiGlowShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="rounded-xl p-[1px]"
      style={{
        backgroundImage:
          "linear-gradient(110deg, rgba(167,139,250,0.45), rgba(129,140,248,0.55), rgba(192,132,252,0.45), rgba(129,140,248,0.5))",
        backgroundSize: "260% 100%",
      }}
      animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
      transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
    >
      {children}
    </motion.div>
  );
}

interface ActionItemsListProps {
  items?: HomeActionItem[];
}

export function ActionItemsList({ items = mockHomeActionItems }: ActionItemsListProps) {
  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm"
      >
        <p className="text-sm font-medium tracking-tight text-foreground">All clear</p>
        <p className="mt-1 text-sm tracking-tight text-muted-foreground">
          No open action items — agents will surface new tasks here.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SNAP_SPRING, delay: 0.14 }}
      className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-14px_rgba(15,23,42,0.08)]"
    >
      <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Needs your attention
        </h2>
        <p className="mt-0.5 text-[11px] leading-snug tracking-tight text-muted-foreground">
          AI-surfaced tasks — click to open.
        </p>
      </div>
      <ul className="flex max-h-[min(40vh,340px)] flex-col gap-2 overflow-y-auto p-3 lg:max-h-[min(36vh,300px)]">
        <AnimatePresence initial={false}>
          {items.map((item, i) => {
            const u = urgencyStyles(item.urgency);
            const linkInner = (
              <Link
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 border-l-4 bg-white px-4 py-3.5 transition-all duration-200 ease-out hover:bg-slate-50/90",
                  u.inner
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium leading-snug tracking-tight text-foreground transition-colors duration-200 group-hover:text-[var(--brand-primary)]">
                    {item.label}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 tabular-nums">
                  <span className="text-base font-semibold tracking-tight text-foreground">
                    {item.count}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0.5 group-hover:opacity-100" />
                </span>
              </Link>
            );

            return (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{
                  ...SNAP_SPRING,
                  delay: 0.12 + i * 0.035,
                }}
              >
                {item.aiRelated ? (
                  <AiGlowShell>
                    <div className="overflow-hidden rounded-[11px] border border-indigo-100/80 bg-indigo-50/30 dark:border-indigo-900/35 dark:bg-indigo-950/20">
                      <motion.div
                        whileHover={{ scale: 1.005 }}
                        whileTap={{ scale: 0.995 }}
                        transition={SNAP_SPRING}
                      >
                        {linkInner}
                      </motion.div>
                    </div>
                  </AiGlowShell>
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.995 }}
                    transition={SNAP_SPRING}
                    className="overflow-hidden rounded-xl border border-slate-100 bg-white"
                  >
                    {linkInner}
                  </motion.div>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </motion.section>
  );
}
