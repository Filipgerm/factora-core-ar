"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronRight,
  ClipboardList,
  FileBarChart,
  Waves,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const SNAP_SPRING = { type: "spring" as const, stiffness: 640, damping: 44 };

type ReportLink = {
  href: string;
  label: string;
  description: string;
  Icon: LucideIcon;
  iconTint: string;
};

const LINKS: ReadonlyArray<ReportLink> = [
  {
    href: "/reporting/income-statement",
    label: "Income Statement",
    description: "Revenue, expenses and net income",
    Icon: FileBarChart,
    iconTint:
      "bg-[var(--brand-primary-subtle)] text-[color:var(--brand-primary)] ring-teal-200/60",
  },
  {
    href: "/general-ledger/prepaid-schedule",
    label: "Prepaid Schedule",
    description: "Contract assets and amortization",
    Icon: ClipboardList,
    iconTint: "bg-blue-50 text-blue-700 ring-blue-200/60",
  },
  {
    href: "/general-ledger/deferred-revenue",
    label: "Revenue Waterfall",
    description: "IFRS 15 deferred liability runoff",
    Icon: Waves,
    iconTint: "bg-violet-50 text-violet-700 ring-violet-200/60",
  },
];

export function HomeReportsSection({ className }: { className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SNAP_SPRING, delay: 0.12 }}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-teal-200/35 bg-[var(--brand-primary-subtle)] shadow-[inset_0_0_0_1px_rgba(47,154,138,0.08)] dark:border-teal-800/35 dark:bg-teal-950/20",
        className
      )}
    >
      <div className="border-b border-teal-200/30 bg-white/40 px-5 py-4 dark:border-teal-800/30 dark:bg-teal-950/15">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
          Reports
        </h2>
        <p className="mt-1 text-[11px] leading-snug tracking-tight text-muted-foreground">
          Jump to financial statements.
        </p>
      </div>

      <ul className="flex flex-1 flex-col gap-2 p-3">
        {LINKS.map((item, i) => {
          const { Icon } = item;
          return (
            <motion.li
              key={item.href}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SNAP_SPRING, delay: 0.16 + i * 0.04 }}
            >
              <Link
                href={item.href}
                className="group flex items-center gap-3 rounded-xl border border-transparent bg-white/70 px-3.5 py-3 shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-all duration-200 hover:-translate-y-[1px] hover:border-teal-200/60 hover:bg-white hover:shadow-[0_2px_10px_-4px_rgba(47,154,138,0.25)] dark:bg-teal-950/30 dark:hover:bg-teal-950/40"
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset transition-colors duration-200",
                    item.iconTint
                  )}
                  aria-hidden
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    {item.label}
                  </div>
                  <div className="mt-0.5 truncate text-[10.5px] leading-snug text-muted-foreground">
                    {item.description}
                  </div>
                </div>
                <ChevronRight
                  className="size-3.5 shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[color:var(--brand-primary)]"
                  aria-hidden
                />
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </motion.section>
  );
}
