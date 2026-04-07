"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import type { GlLegalEntity } from "@/lib/schemas/general-ledger";
import { useGlEntitiesQuery } from "@/lib/hooks/api/use-general-ledger";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export type LedgerViewContextValue = {
  entities: GlLegalEntity[];
  effectiveEntityId: string | null;
  consolidated: boolean;
  displayCurrency: string;
  setEntityId: (id: string | null) => void;
  setConsolidated: (v: boolean) => void;
  setDisplayCurrency: (code: string) => void;
};

const LedgerViewContext = createContext<LedgerViewContextValue | null>(null);

export function useLedgerView(): LedgerViewContextValue {
  const ctx = useContext(LedgerViewContext);
  if (!ctx) {
    throw new Error("useLedgerView must be used within GeneralLedgerLayoutClient");
  }
  return ctx;
}

const NAV = [
  { href: "/general-ledger", label: "Overview" },
  { href: "/general-ledger/chart-of-accounts", label: "Chart of accounts" },
  { href: "/general-ledger/journal-entries", label: "Journal entries" },
  { href: "/general-ledger/periods", label: "Periods" },
  { href: "/general-ledger/billing-aggregations", label: "Billing aggregations" },
  { href: "/general-ledger/deferred-revenue", label: "Deferred revenue" },
  { href: "/general-ledger/recurring-templates", label: "Recurring entries" },
] as const;

export function GeneralLedgerLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: entities = [], isLoading } = useGlEntitiesQuery();

  const entityIdParam = searchParams.get("entityId");
  const consolidated = searchParams.get("consolidated") === "1";
  const displayCurrency = (searchParams.get("currency") || "EUR").toUpperCase();

  const defaultEntityId = entities[0]?.id ?? null;
  const effectiveEntityId = consolidated
    ? null
    : entityIdParam || defaultEntityId;

  const pushParams = useCallback(
    (patch: Record<string, string | null>) => {
      const n = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") n.delete(k);
        else n.set(k, v);
      }
      const q = n.toString();
      router.push(q ? `${pathname}?${q}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const setEntityId = useCallback(
    (id: string | null) => {
      pushParams({
        entityId: id,
        consolidated: null,
      });
    },
    [pushParams]
  );

  const setConsolidated = useCallback(
    (v: boolean) => {
      if (v) {
        pushParams({ consolidated: "1", entityId: null });
      } else {
        pushParams({
          consolidated: null,
          entityId: entityIdParam || defaultEntityId || "",
        });
      }
    },
    [pushParams, entityIdParam, defaultEntityId]
  );

  const setDisplayCurrency = useCallback(
    (code: string) => {
      pushParams({ currency: code.toUpperCase() });
    },
    [pushParams]
  );

  const value = useMemo<LedgerViewContextValue>(
    () => ({
      entities,
      effectiveEntityId,
      consolidated,
      displayCurrency,
      setEntityId,
      setConsolidated,
      setDisplayCurrency,
    }),
    [
      consolidated,
      displayCurrency,
      effectiveEntityId,
      entities,
      setConsolidated,
      setDisplayCurrency,
      setEntityId,
    ]
  );

  return (
    <LedgerViewContext.Provider value={value}>
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                General ledger
              </h1>
              <p className="text-xs text-muted-foreground">
                IFRS-oriented books, usage-batch rollups, and draft journals.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="gl-consolidated"
                  className="text-xs text-muted-foreground"
                >
                  Consolidated
                </Label>
                <Switch
                  id="gl-consolidated"
                  checked={consolidated}
                  onCheckedChange={setConsolidated}
                  className="transition-all duration-200"
                />
              </div>
              {!consolidated && (
                <div className="flex min-w-[200px] flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Entity</Label>
                  <Select
                    value={effectiveEntityId ?? ""}
                    onValueChange={(v) => setEntityId(v)}
                    disabled={isLoading || entities.length === 0}
                  >
                    <SelectTrigger className="h-9 transition-all duration-200">
                      <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                      {entities.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.code} — {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex min-w-[120px] flex-col gap-1">
                <Label className="text-xs text-muted-foreground">
                  Display currency
                </Label>
                <Select
                  value={displayCurrency}
                  onValueChange={setDisplayCurrency}
                >
                  <SelectTrigger className="h-9 transition-all duration-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["EUR", "USD", "GBP"].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <nav className="flex flex-wrap gap-1">
            {NAV.map(({ href, label }) => {
              const active =
                href === "/general-ledger"
                  ? pathname === href
                  : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={`${href}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs font-medium tracking-tight transition-all duration-200",
                    active
                      ? "bg-[var(--brand-primary-subtle)] text-foreground shadow-[inset_0_0_0_1px_rgba(47,154,138,0.12)]"
                      : "text-muted-foreground hover:bg-slate-100/80 hover:text-foreground"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </LedgerViewContext.Provider>
  );
}
