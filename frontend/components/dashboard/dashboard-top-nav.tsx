"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { mockHomeUserFirstName } from "@/lib/mock-data/dashboard-mocks";
import { cn } from "@/lib/utils";

const SEGMENT_LABEL: Record<string, string> = {
  home: "Home",
  ledger: "Smart Ledger",
  integrations: "Integrations",
  reconciliation: "Reconciliation",
  "ar-collections": "AR Collections",
};

function breadcrumbsForPath(pathname: string) {
  const seg = pathname.replace(/^\//, "").split("/").filter(Boolean)[0] ?? "home";
  const label = SEGMENT_LABEL[seg] ?? seg.replace(/-/g, " ");
  return [{ href: `/${seg}`, label }];
}

export function DashboardTopNav() {
  const pathname = usePathname();
  const crumbs = breadcrumbsForPath(pathname || "/home");
  const initials = mockHomeUserFirstName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-slate-100 bg-white/70 px-4 py-2.5 backdrop-blur-md md:px-5">
      <div className="flex items-center gap-3 md:gap-4">
        <nav
          className="hidden min-w-0 shrink-0 items-center gap-1 text-sm font-medium tracking-tight text-muted-foreground sm:flex"
          aria-label="Breadcrumb"
        >
          <Link
            href="/home"
            className="truncate text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Factora
          </Link>
          {crumbs.map((c) => (
            <span key={c.href} className="flex items-center gap-1">
              <ChevronRight className="size-3.5 opacity-50" aria-hidden />
              <span className="truncate text-xs font-semibold text-foreground">
                {c.label}
              </span>
            </span>
          ))}
        </nav>

        <div className="relative min-w-0 flex-1 max-w-xl">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search transactions, invoices, counterparties…"
            className={cn(
              "h-9 border-slate-200/90 bg-white/90 pl-9 text-sm shadow-sm",
              "placeholder:text-muted-foreground/60"
            )}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Avatar className="size-8 border border-slate-100 shadow-sm">
            <AvatarFallback className="bg-[var(--brand-primary-subtle)] text-xs font-semibold text-[var(--brand-primary)]">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1 border-t border-slate-100/80 pt-2 sm:hidden">
        {crumbs.map((c) => (
          <span
            key={c.href}
            className="truncate text-xs font-semibold text-foreground"
          >
            {c.label}
          </span>
        ))}
      </div>
    </header>
  );
}
