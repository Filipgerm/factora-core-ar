"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  GitMerge,
  Home,
  Layers,
  Plug,
  Wallet,
  CreditCard,
  BarChart3,
} from "lucide-react";

import { cn } from "@/lib/utils";

const AR_PREFIX = "/accounts-receivable";
const AP_PREFIX = "/accounts-payable";

const AR_CHILDREN = [
  { href: `${AR_PREFIX}/customers`, label: "Customers" },
  { href: `${AR_PREFIX}/invoices`, label: "Invoices" },
  { href: `${AR_PREFIX}/credit-memos`, label: "Credit Memos" },
] as const;

const AP_CHILDREN = [
  { href: `${AP_PREFIX}/vendors`, label: "Vendors" },
  { href: `${AP_PREFIX}/bills`, label: "Bills" },
  { href: `${AP_PREFIX}/charges`, label: "Charges" },
  { href: `${AP_PREFIX}/reimbursements`, label: "Reimbursements" },
] as const;

const SIMPLE_NAV = [
  { href: "/home", label: "Home", icon: Home },
  {
    href: "/reconciliation",
    label: "Cash Reconciliation",
    icon: GitMerge,
  },
  { href: "/ledger", label: "Smart Ledger", icon: Layers },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/reporting", label: "Reporting", icon: BarChart3 },
] as const;

const navBtn =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium tracking-tight transition-all duration-200 ease-out";

const subLink =
  "block rounded-md px-3 py-1.5 text-xs font-medium tracking-tight text-foreground/90 transition-colors duration-200 hover:bg-white/60 hover:text-foreground";

export function AppSidebar() {
  const pathname = usePathname() || "";
  const [openKey, setOpenKey] = useState<"ar" | "ap" | null>(null);

  const arOnPath = pathname.startsWith(AR_PREFIX);
  const apOnPath = pathname.startsWith(AP_PREFIX);
  const arOpen = arOnPath || openKey === "ar";
  const apOpen = apOnPath || openKey === "ap";

  useEffect(() => {
    setOpenKey((k) => {
      let next = k;
      if (!pathname.startsWith(AR_PREFIX) && next === "ar") next = null;
      if (!pathname.startsWith(AP_PREFIX) && next === "ap") next = null;
      return next;
    });
  }, [pathname]);

  const toggleAr = () => {
    if (arOnPath) return;
    setOpenKey((k) => {
      const next = k === "ar" ? null : "ar";
      return next === "ar" ? "ar" : null;
    });
  };

  const toggleAp = () => {
    if (apOnPath) return;
    setOpenKey((k) => {
      const next = k === "ap" ? null : "ap";
      return next === "ap" ? "ap" : null;
    });
  };

  const arParentActive = arOnPath || openKey === "ar";
  const apParentActive = apOnPath || openKey === "ap";

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
        {SIMPLE_NAV.slice(0, 2).map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                navBtn,
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

        {/* Accounts Receivable */}
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            aria-expanded={arOpen}
            onClick={() => {
              setOpenKey((k) => {
                if (arOnPath) return k;
                if (k === "ar") return null;
                return "ar";
              });
            }}
            className={cn(
              navBtn,
              arParentActive
                ? "bg-[var(--brand-primary-subtle)] text-foreground shadow-[inset_0_0_0_1px_rgba(47,154,138,0.12)]"
                : "text-sidebar-muted-foreground hover:bg-slate-100/80 hover:text-foreground"
            )}
          >
            <CreditCard className="size-4 shrink-0 opacity-90" aria-hidden />
            <span className="min-w-0 flex-1">Accounts Receivable</span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 opacity-70 transition-transform duration-200",
                arOpen && "rotate-180"
              )}
              aria-hidden
            />
          </button>
          {arOpen ? (
            <div
              className="ml-1 space-y-0.5 rounded-lg border border-teal-200/40 bg-[var(--brand-primary-subtle)] py-1.5 pl-2 pr-1 shadow-[inset_0_0_0_1px_rgba(47,154,138,0.08)] dark:border-teal-800/40 dark:bg-teal-950/20"
              role="region"
              aria-label="Accounts Receivable"
            >
              {AR_CHILDREN.map(({ href, label }) => {
                const subActive =
                  pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      subLink,
                      subActive &&
                        "bg-white/80 font-semibold text-foreground shadow-sm dark:bg-teal-950/40"
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Accounts Payable */}
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            aria-expanded={apOpen}
            onClick={() => {
              setOpenKey((k) => {
                if (apOnPath) return k;
                if (k === "ap") return null;
                return "ap";
              });
            }}
            className={cn(
              navBtn,
              apParentActive
                ? "bg-[var(--brand-primary-subtle)] text-foreground shadow-[inset_0_0_0_1px_rgba(47,154,138,0.12)]"
                : "text-sidebar-muted-foreground hover:bg-slate-100/80 hover:text-foreground"
            )}
          >
            <Wallet className="size-4 shrink-0 opacity-90" aria-hidden />
            <span className="min-w-0 flex-1">Accounts Payable</span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 opacity-70 transition-transform duration-200",
                apOpen && "rotate-180"
              )}
              aria-hidden
            />
          </button>
          {apOpen ? (
            <div
              className="ml-1 space-y-0.5 rounded-lg border border-teal-200/40 bg-[var(--brand-primary-subtle)] py-1.5 pl-2 pr-1 shadow-[inset_0_0_0_1px_rgba(47,154,138,0.08)] dark:border-teal-800/40 dark:bg-teal-950/20"
              role="region"
              aria-label="Accounts Payable"
            >
              {AP_CHILDREN.map(({ href, label }) => {
                const subActive =
                  pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      subLink,
                      subActive &&
                        "bg-white/80 font-semibold text-foreground shadow-sm dark:bg-teal-950/40"
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>

        {SIMPLE_NAV.slice(2).map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                navBtn,
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
