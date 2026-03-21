"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BookOpen,
  GitMerge,
  Home,
  Layers,
  Plug,
  Wallet,
  CreditCard,
  BarChart3,
} from "lucide-react";

import { OrganizationSwitcher } from "@/components/dashboard/organization-switcher";
import { cn } from "@/lib/utils";

const AR_PREFIX = "/accounts-receivable";
const AP_PREFIX = "/accounts-payable";

const AR_CHILDREN = [
  { href: `${AR_PREFIX}/customers`, label: "Customers" },
  { href: `${AR_PREFIX}/products`, label: "Products" },
  { href: `${AR_PREFIX}/contracts`, label: "Contracts" },
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

const flyoutLink =
  "block rounded-md px-3 py-2 text-xs font-medium tracking-tight text-foreground/90 transition-colors duration-200 hover:bg-white/60 hover:text-foreground";

export function AppSidebar() {
  const pathname = usePathname() || "";
  const [openKey, setOpenKey] = useState<"ar" | "ap" | null>(null);
  const [flyoutLayout, setFlyoutLayout] = useState<{
    top: number;
    bottom: number;
  }>({ top: 0, bottom: 0 });

  const railRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const arTriggerRef = useRef<HTMLButtonElement>(null);
  const apTriggerRef = useRef<HTMLButtonElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  const arOnPath = pathname.startsWith(AR_PREFIX);
  const apOnPath = pathname.startsWith(AP_PREFIX);
  const showArFlyout = arOnPath || openKey === "ar";
  const showApFlyout = apOnPath || openKey === "ap";
  const flyoutVisible = showArFlyout || showApFlyout;
  const flyoutMode = showApFlyout ? "ap" : "ar";

  useEffect(() => {
    setOpenKey((k) => {
      let next = k;
      if (!pathname.startsWith(AR_PREFIX) && next === "ar") next = null;
      if (!pathname.startsWith(AP_PREFIX) && next === "ap") next = null;
      return next;
    });
  }, [pathname]);

  const updateFlyoutLayout = useCallback(() => {
    const rail = railRef.current;
    const aside = asideRef.current;
    const footer = footerRef.current;
    const trigger =
      flyoutMode === "ap" ? apTriggerRef.current : arTriggerRef.current;
    if (!rail || !aside || !footer || !trigger) return;

    const railRect = rail.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();

    const top = Math.max(0, triggerRect.top - railRect.top);
    /** Inset from rail bottom so flyout ends at workspace footer top. */
    const bottom = Math.max(0, railRect.bottom - footerRect.top);

    setFlyoutLayout({ top, bottom });
  }, [flyoutMode]);

  useLayoutEffect(() => {
    if (!flyoutVisible) return;
    updateFlyoutLayout();
  }, [flyoutVisible, flyoutMode, pathname, updateFlyoutLayout]);

  useEffect(() => {
    if (!flyoutVisible) return;
    const ro = new ResizeObserver(() => updateFlyoutLayout());
    if (railRef.current) ro.observe(railRef.current);
    window.addEventListener("resize", updateFlyoutLayout);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateFlyoutLayout);
    };
  }, [flyoutVisible, updateFlyoutLayout]);

  useEffect(() => {
    if (!flyoutVisible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (arOnPath || apOnPath) return;
        setOpenKey(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [flyoutVisible, arOnPath, apOnPath]);

  const arParentActive = arOnPath || openKey === "ar";
  const apParentActive = apOnPath || openKey === "ap";

  const onArClick = () => {
    setOpenKey((k) => {
      if (arOnPath) return k;
      if (k === "ar") return null;
      return "ar";
    });
  };

  const onApClick = () => {
    setOpenKey((k) => {
      if (apOnPath) return k;
      if (k === "ap") return null;
      return "ap";
    });
  };

  const links = flyoutMode === "ap" ? AP_CHILDREN : AR_CHILDREN;
  const flyoutLabel =
    flyoutMode === "ap" ? "Accounts Payable" : "Accounts Receivable";

  return (
    <div
      ref={railRef}
      className="relative flex h-svh min-h-0 shrink-0"
    >
      <aside
        ref={asideRef}
        className="flex w-56 shrink-0 flex-col border-r border-slate-100 bg-sidebar text-sidebar-foreground"
      >
        <div className="border-b border-slate-100 px-2 py-2">
          <OrganizationSwitcher />
        </div>
        <div className="flex h-11 items-center px-4">
          <Link
            href="/home"
            className="text-sm font-semibold tracking-tight text-sidebar-foreground transition-colors duration-200 hover:text-[var(--sidebar-primary)]"
          >
            Factora
          </Link>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2">
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

          <div className="flex flex-col gap-0.5">
            <button
              ref={arTriggerRef}
              type="button"
              aria-expanded={showArFlyout}
              aria-controls="sidebar-ar-ap-flyout"
              onClick={onArClick}
              className={cn(
                navBtn,
                arParentActive
                  ? "bg-[var(--brand-primary-subtle)] text-foreground shadow-[inset_0_0_0_1px_rgba(47,154,138,0.12)]"
                  : "text-sidebar-muted-foreground hover:bg-slate-100/80 hover:text-foreground"
              )}
            >
              <CreditCard className="size-4 shrink-0 opacity-90" aria-hidden />
              <span className="min-w-0 flex-1 text-left">
                Accounts Receivable
              </span>
            </button>
          </div>

          <div className="flex flex-col gap-0.5">
            <button
              ref={apTriggerRef}
              type="button"
              aria-expanded={showApFlyout}
              aria-controls="sidebar-ar-ap-flyout"
              onClick={onApClick}
              className={cn(
                navBtn,
                apParentActive
                  ? "bg-[var(--brand-primary-subtle)] text-foreground shadow-[inset_0_0_0_1px_rgba(47,154,138,0.12)]"
                  : "text-sidebar-muted-foreground hover:bg-slate-100/80 hover:text-foreground"
              )}
            >
              <Wallet className="size-4 shrink-0 opacity-90" aria-hidden />
              <span className="min-w-0 flex-1 text-left">
                Accounts Payable
              </span>
            </button>
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
        <div ref={footerRef} className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium tracking-tight text-sidebar-muted-foreground">
            <BookOpen className="size-3.5 shrink-0 opacity-80" aria-hidden />
            <span className="truncate">Workspace</span>
          </div>
        </div>
      </aside>

      {flyoutVisible ? (
        <nav
          id="sidebar-ar-ap-flyout"
          role="navigation"
          aria-label={flyoutLabel}
          className={cn(
            "absolute z-30 w-52 border-l border-teal-200/45 bg-[var(--brand-primary-subtle)] shadow-sm transition-all duration-200 ease-out",
            "dark:border-teal-800/45 dark:bg-teal-950/25"
          )}
          style={{
            left: "100%",
            top: flyoutLayout.top,
            bottom: flyoutLayout.bottom,
          }}
        >
          <div className="flex h-full flex-col gap-0.5 overflow-y-auto p-2 pt-3 shadow-[inset_0_0_0_1px_rgba(47,154,138,0.06)]">
            {links.map(({ href, label }) => {
              const subActive =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    flyoutLink,
                    subActive &&
                      "bg-white/85 font-semibold text-foreground shadow-sm dark:bg-teal-950/50"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
