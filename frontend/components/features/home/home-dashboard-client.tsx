"use client";

import { useEffect, useRef } from "react";
import { BarChart3 } from "lucide-react";

import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";
import {
  buildActionItemsFromSellerMetrics,
  buildHomeKpiMetricsFromPlMetrics,
} from "@/lib/dashboard/build-home-from-api";
import { useAuthSession } from "@/lib/hooks/api/use-auth";
import {
  DASHBOARD_PL_DAYS_DEFAULT,
  useDashboardPlMetricsQuery,
  useDashboardSellerMetricsQuery,
} from "@/lib/hooks/api/use-dashboard";
import { useResolvedSaltEdgeCustomerId } from "@/lib/hooks/api/use-saltedge";
import { isApiError } from "@/lib/api/types";
import { useToast } from "@/hooks/use-toast";

import { ActionItemsList } from "./action-items-list";
import { HomeDashboardGreeting } from "./home-dashboard-greeting";
import { HomeKpiBento } from "./home-kpi-bento";
import { HomeKpiBentoSkeleton } from "./home-kpi-skeleton";
import { HomeReportsSection } from "./home-reports-section";
import { HomeTechStackSection } from "./home-tech-stack-section";

export function HomeDashboardClient() {
  const { data: session } = useAuthSession();
  const { toast } = useToast();
  const { customerId } = useResolvedSaltEdgeCustomerId();
  const pl = useDashboardPlMetricsQuery(
    customerId ? { customerId, days: DASHBOARD_PL_DAYS_DEFAULT } : null
  );
  const seller = useDashboardSellerMetricsQuery();

  const lastToastKey = useRef<string | null>(null);

  useEffect(() => {
    const errs = [pl.error, seller.error].filter(Boolean);
    if (errs.length === 0) {
      lastToastKey.current = null;
      return;
    }
    const first = errs[0];
    const message = isApiError(first)
      ? first.message
      : "Something went wrong loading the dashboard.";
    const key = `${message}:${errs.length}`;
    if (lastToastKey.current === key) return;
    lastToastKey.current = key;
    toast({
      variant: "destructive",
      title: "Could not load dashboard data",
      description: message,
    });
  }, [pl.error, seller.error, toast]);

  const hasOrg = Boolean(session?.profile?.organization_id);

  const firstName = session?.profile?.username?.split(/\s+/)[0] ?? "there";

  const kpiSection = (() => {
    if (!hasOrg) {
      return (
        <FeatureEmptyState
          icon={BarChart3}
          title="Organization required"
          description="Complete setup to see KPIs from your ledger and banking data."
          ctaHref="/integrations"
          ctaLabel="Continue setup"
        />
      );
    }
    if (!customerId) {
      return (
        <FeatureEmptyState
          icon={BarChart3}
          title="Connect banking for P&amp;L metrics"
          description="Link open banking and resolve a customer id to load revenue, expenses, and net income for the dashboard period."
          ctaHref="/integrations"
          ctaLabel="Open integrations"
        />
      );
    }
    if (pl.isLoading) {
      return <HomeKpiBentoSkeleton />;
    }
    if (pl.isError) {
      return (
        <FeatureEmptyState
          icon={BarChart3}
          title="Could not load metrics"
          description="We could not load P&amp;L metrics from banking. Check your connection or try again."
          ctaHref="/integrations"
          ctaLabel="Integrations"
        />
      );
    }
    if (pl.data) {
      return <HomeKpiBento metrics={buildHomeKpiMetricsFromPlMetrics(pl.data)} />;
    }
    return (
      <FeatureEmptyState
        icon={BarChart3}
        title="Could not load metrics"
        description="Check your connection and try again. If the problem persists, verify banking customer and account linkage."
        ctaHref="/integrations"
        ctaLabel="Integrations"
      />
    );
  })();

  const actionItems =
    hasOrg && seller.data
      ? buildActionItemsFromSellerMetrics(seller.data)
      : [];

  return (
    <div className="flex min-h-0 flex-col gap-6 lg:gap-8">
      <HomeDashboardGreeting firstName={firstName} />

      {kpiSection}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="min-h-0 space-y-6 lg:col-span-7">
          {seller.isLoading && !seller.data ? (
            <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
            </div>
          ) : (
            <ActionItemsList items={actionItems} />
          )}

          {hasOrg ? <HomeTechStackSection /> : null}
        </div>
        <div className="min-h-0 space-y-6 lg:col-span-5">
          <HomeReportsSection className="h-full" />
        </div>
      </div>
    </div>
  );
}
