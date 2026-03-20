"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CreditCard,
  GitMerge,
  Layers,
  Plug,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/ledger", label: "Smart Ledger", icon: Layers },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/reconciliation", label: "Reconciliation", icon: GitMerge },
  { href: "/ar-collections", label: "AR Collections", icon: CreditCard },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-card">
      <div className="flex h-14 items-center border-b border-slate-200 px-4">
        <Link
          href="/ledger"
          className="text-lg font-semibold tracking-tight text-foreground transition-all duration-200 hover:text-primary"
        >
          Factora
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-slate-100 text-foreground"
                  : "text-muted-foreground hover:bg-slate-50 hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground">
          <BookOpen className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">Demo workspace</span>
        </div>
      </div>
    </aside>
  );
}
