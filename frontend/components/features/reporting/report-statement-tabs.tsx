"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/reporting/income-statement", label: "Income statement" },
  { href: "/reporting/balance-sheet", label: "Balance sheet" },
  { href: "/reporting/cash-flow", label: "Cash flow" },
  { href: "/reporting/executive-metrics", label: "SaaS metrics" },
] as const;

export function ReportStatementTabs() {
  const pathname = usePathname() || "";

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-slate-100 pb-4 dark:border-slate-800"
      aria-label="Financial reports"
    >
      {TABS.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold tracking-tight transition-all duration-200",
              active
                ? "border-slate-900 bg-slate-50 text-foreground shadow-sm dark:border-slate-200 dark:bg-slate-900 dark:text-slate-100"
                : "border-slate-200/90 bg-white text-muted-foreground hover:border-slate-300 hover:text-foreground dark:border-slate-700 dark:bg-background dark:hover:border-slate-600"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
