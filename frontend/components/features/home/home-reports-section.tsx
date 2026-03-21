"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FileBarChart } from "lucide-react";

import { cn } from "@/lib/utils";

const SNAP_SPRING = { type: "spring" as const, stiffness: 640, damping: 44 };

const LINKS = [
  { href: "/reporting/income-statement", label: "Income Statement" },
  { href: "/reporting/cash-flow", label: "Cashflow Statement" },
  { href: "/reporting/executive-metrics", label: "Executive P&L" },
] as const;

export function HomeReportsSection({ className }: { className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SNAP_SPRING, delay: 0.12 }}
      className={cn(
        "overflow-hidden rounded-2xl border border-teal-200/35 bg-[var(--brand-primary-subtle)] shadow-[inset_0_0_0_1px_rgba(47,154,138,0.08)] dark:border-teal-800/35 dark:bg-teal-950/20",
        className
      )}
    >
      <div className="border-b border-teal-200/30 bg-white/40 px-5 py-4 dark:border-teal-800/30 dark:bg-teal-950/15">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Reports
        </h2>
        <p className="mt-0.5 text-[11px] leading-snug tracking-tight text-muted-foreground">
          Jump to financial statements.
        </p>
      </div>
      <ul className="divide-y divide-teal-200/25 dark:divide-teal-800/25">
        {LINKS.map((item, i) => (
          <motion.li
            key={item.href}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SNAP_SPRING, delay: 0.16 + i * 0.04 }}
          >
            <Link
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-white/50 dark:hover:bg-teal-950/30"
            >
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-teal-200/40 bg-white text-[var(--brand-primary)] shadow-sm dark:border-teal-800/50 dark:bg-teal-950/40"
                aria-hidden
              >
                <FileBarChart className="size-3.5" />
              </div>
              <span className="text-xs font-medium tracking-tight text-foreground">
                {item.label}
              </span>
            </Link>
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
}
