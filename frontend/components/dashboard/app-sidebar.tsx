"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

/** Sidebar width in px — must match `w-56` (14rem). */
const SIDEBAR_WIDTH_PX = 224;
const FLYOUT_WIDTH_PX = 208; // w-52

export function AppSidebar() {
  const pathname = usePathname() || "";
  /** Flyout open section; not tied to current route so outside-click can dismiss on AR/AP pages. */
  const [expanded, setExpanded] = useState<"ar" | "ap" | null>(null);
  const [flyoutTopPx, setFlyoutTopPx] = useState(0);

  const railRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const flyoutRef = useRef<HTMLElement>(null);
  const arTriggerRef = useRef<HTMLButtonElement>(null);
  const apTriggerRef = useRef<HTMLButtonElement>(null);

  const arOnPath = pathname.startsWith(AR_PREFIX);
  const apOnPath = pathname.startsWith(AP_PREFIX);
  const flyoutVisible = expanded !== null;
  const flyoutMode = expanded ?? "ar";

  const updateFlyoutTop = useCallback(() => {
    const trigger =
      flyoutMode === "ap" ? apTriggerRef.current : arTriggerRef.current;
    if (!trigger) return;
    setFlyoutTopPx(Math.round(trigger.getBoundingClientRect().top));
  }, [flyoutMode]);

  useLayoutEffect(() => {
    if (!flyoutVisible) return;
    updateFlyoutTop();
  }, [flyoutVisible, flyoutMode, pathname, updateFlyoutTop]);

  useEffect(() => {
    if (!flyoutVisible) return;
    const ro = new ResizeObserver(() => updateFlyoutTop());
    if (railRef.current) ro.observe(railRef.current);
    window.addEventListener("resize", updateFlyoutTop);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateFlyoutTop);
    };
  }, [flyoutVisible, updateFlyoutTop]);

  useEffect(() => {
    if (!flyoutVisible) return;
    const nav = navRef.current;
    if (!nav) return;
    nav.addEventListener("scroll", updateFlyoutTop, { passive: true });
    return () => nav.removeEventListener("scroll", updateFlyoutTop);
  }, [flyoutVisible, updateFlyoutTop]);

  useEffect(() => {
    if (!flyoutVisible) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (flyoutRef.current?.contains(t)) return;
      if (arTriggerRef.current?.contains(t)) return;
      if (apTriggerRef.current?.contains(t)) return;
      setExpanded(null);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [flyoutVisible]);

  useEffect(() => {
    if (!flyoutVisible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [flyoutVisible]);

  const arParentActive = arOnPath || expanded === "ar";
  const apParentActive = apOnPath || expanded === "ap";

  const onArClick = () => {
    setExpanded((e) => (e === "ar" ? null : "ar"));
  };

  const onApClick = () => {
    setExpanded((e) => (e === "ap" ? null : "ap"));
  };

  const closeFlyout = () => setExpanded(null);

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
        <nav
          ref={navRef}
          className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2"
        >
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
              aria-expanded={expanded === "ar"}
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
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 opacity-70 transition-transform duration-200",
                  expanded === "ar" && "rotate-180"
                )}
                aria-hidden
              />
            </button>
          </div>

          <div className="flex flex-col gap-0.5">
            <button
              ref={apTriggerRef}
              type="button"
              aria-expanded={expanded === "ap"}
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
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 opacity-70 transition-transform duration-200",
                  expanded === "ap" && "rotate-180"
                )}
                aria-hidden
              />
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
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium tracking-tight text-sidebar-muted-foreground">
            <BookOpen className="size-3.5 shrink-0 opacity-80" aria-hidden />
            <span className="truncate">Workspace</span>
          </div>
        </div>
      </aside>

      {flyoutVisible ? (
        <nav
          ref={flyoutRef}
          id="sidebar-ar-ap-flyout"
          role="navigation"
          aria-label={flyoutLabel}
          className={cn(
            "fixed z-40 overflow-hidden rounded-r-xl border border-l-0 border-teal-200/45 bg-[var(--brand-primary-subtle)] shadow-md transition-[opacity,transform] duration-200 ease-out dark:border-teal-800/45 dark:bg-teal-950/25"
          )}
          style={{
            left: SIDEBAR_WIDTH_PX,
            top: flyoutTopPx,
            bottom: 0,
            width: FLYOUT_WIDTH_PX,
          }}
        >
          <div className="flex h-full max-h-full flex-col gap-0.5 overflow-y-auto p-2 pt-3 shadow-[inset_0_0_0_1px_rgba(47,154,138,0.06)]">
            {links.map(({ href, label }) => {
              const subActive =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={closeFlyout}
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
