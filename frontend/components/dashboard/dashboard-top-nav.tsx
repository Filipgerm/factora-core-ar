"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";

import { ImportDataButton } from "@/components/dashboard/import-data-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthSession, useLogoutMutation } from "@/lib/hooks/api/use-auth";
import { cn } from "@/lib/utils";

/** First path segment → section title */
const ROOT_SEGMENT_LABEL: Record<string, string> = {
  home: "Home",
  integrations: "Integrations",
  reconciliation: "Cash Reconciliation",
  "ar-collections": "AR Collections",
  reporting: "Reporting",
  "accounts-receivable": "Accounts receivable",
  "accounts-payable": "Accounts payable",
};

/** Leaf slug → label (kebab-case keys) */
const LEAF_LABEL: Record<string, string> = {
  customers: "Customers",
  products: "Products",
  contracts: "Contracts",
  invoices: "Invoices",
  "credit-memos": "Credit memos",
  vendors: "Vendors",
  bills: "Bills",
  charges: "Charges",
  reimbursements: "Reimbursements",
  "income-statement": "Income statement",
  "balance-sheet": "Balance sheet",
  "cash-flow": "Cash flow",
  "executive-metrics": "SaaS metrics",
  "vat-return": "VAT return",
};

function labelForSegment(segment: string, index: number): string {
  if (index === 0) {
    return ROOT_SEGMENT_LABEL[segment] ?? segment.replace(/-/g, " ");
  }
  return (
    LEAF_LABEL[segment] ??
    segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function breadcrumbsForPath(pathname: string) {
  const raw = pathname.replace(/^\//, "").split("/").filter(Boolean);
  if (raw.length === 0) {
    return [{ href: "/home", label: "Home" }];
  }

  const items: { href: string; label: string }[] = [];
  let acc = "";
  for (let i = 0; i < raw.length; i++) {
    acc += `/${raw[i]}`;
    items.push({
      href: acc,
      label: labelForSegment(raw[i], i),
    });
  }
  return items;
}

export function DashboardTopNav() {
  const pathname = usePathname() || "/home";
  const router = useRouter();
  const crumbs = breadcrumbsForPath(pathname);
  const { data: session } = useAuthSession();
  const logout = useLogoutMutation();
  const displayName = session?.profile?.username ?? "Guest";
  const initials =
    displayName
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
            <span key={c.href} className="flex min-w-0 items-center gap-1">
              <ChevronRight className="size-3.5 shrink-0 opacity-50" aria-hidden />
              <Link
                href={c.href}
                className="truncate text-xs font-semibold text-foreground hover:underline"
              >
                {c.label}
              </Link>
            </span>
          ))}
        </nav>

        <div className="relative min-w-0 max-w-xl flex-1">
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
          <ImportDataButton />
          {session?.hasToken ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              disabled={logout.isPending}
              onClick={() =>
                logout.mutate(undefined, {
                  onSuccess: () => router.push("/login"),
                })
              }
            >
              Sign out
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/login" className="hidden sm:inline-flex">
                Sign in
              </Link>
            </Button>
          )}
          <Avatar className="size-8 border border-slate-100 shadow-sm">
            <AvatarFallback className="bg-[var(--brand-primary-subtle)] text-xs font-semibold text-[var(--brand-primary)]">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="mt-2 flex min-w-0 items-center gap-1 overflow-x-auto border-t border-slate-100/80 pt-2 sm:hidden">
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
