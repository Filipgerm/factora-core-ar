"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CreditCard,
  GitMerge,
  Home,
  Layers,
  Plug,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/ledger", label: "Smart Ledger", icon: Layers },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/reconciliation", label: "Reconciliation", icon: GitMerge },
  { href: "/ar-collections", label: "AR Collections", icon: CreditCard },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-100 bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b border-slate-100 px-4">
        <Link
          href="/home"
          className="text-sm font-semibold tracking-tight text-sidebar-foreground transition-colors duration-200 hover:text-[var(--sidebar-primary)]"
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
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium tracking-tight transition-all duration-200 ease-out",
                active
                  ? "bg-[var(--brand-primary-subtle)] text-foreground shadow-[inset_0_0_0_1px_rgba(47,154,138,0.12)]"
                  : "text-sidebar-muted-foreground hover:bg-slate-100/80 hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium tracking-tight text-sidebar-muted-foreground">
          <BookOpen className="size-3.5 shrink-0 opacity-80" aria-hidden />
          <span className="truncate">Workspace</span>
        </div>
      </div>
    </aside>
  );
}
