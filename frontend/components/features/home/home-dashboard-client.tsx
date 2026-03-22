"use client";

import Link from "next/link";
import { BarChart3 } from "lucide-react";

import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";
import {
  buildActionItemsFromSellerMetrics,
  buildHomeKpiMetricsFromPlMetrics,
} from "@/lib/dashboard/build-home-from-api";
import { transactionsToActivityItems } from "@/lib/dashboard/transactions-to-activity";
import { useAuthSession } from "@/lib/hooks/api/use-auth";
import {
  useDashboardPlMetricsQuery,
  useDashboardSellerMetricsQuery,
  useDashboardTransactionsQuery,
} from "@/lib/hooks/api/use-dashboard";
import { useResolvedSaltEdgeCustomerId } from "@/lib/hooks/api/use-saltedge";
import { Button } from "@/components/ui/button";

import { ActionItemsList } from "./action-items-list";
import { HomeActivitySkeleton } from "./home-activity-skeleton";
import { HomeDashboardGreeting } from "./home-dashboard-greeting";
import { HomeKpiBento } from "./home-kpi-bento";
import { HomeKpiBentoSkeleton } from "./home-kpi-skeleton";
import { HomeReportsSection } from "./home-reports-section";
import { RecentActivityFeed } from "./recent-activity-feed";

export function HomeDashboardClient() {
  const { data: session } = useAuthSession();
  const { customerId } = useResolvedSaltEdgeCustomerId();
  const pl = useDashboardPlMetricsQuery(
    customerId ? { customerId, days: 30 } : null
  );
  const seller = useDashboardSellerMetricsQuery();
  const txs = useDashboardTransactionsQuery(
    customerId ? { customerId, limit: 12 } : null
  );

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
          description="Link open banking (Salt Edge) and resolve a customer id to load revenue, expenses, and net income for the dashboard period."
          ctaHref="/integrations"
          ctaLabel="Open integrations"
        />
      );
    }
    if (pl.isLoading) {
      return <HomeKpiBentoSkeleton />;
    }
    if (pl.data) {
      return <HomeKpiBento metrics={buildHomeKpiMetricsFromPlMetrics(pl.data)} />;
    }
    return (
      <FeatureEmptyState
        icon={BarChart3}
        title="Could not load metrics"
        description="Check your connection and try again. If the problem persists, verify Salt Edge customer and account linkage."
        ctaHref="/integrations"
        ctaLabel="Integrations"
      />
    );
  })();

  const actionItems =
    hasOrg && seller.data
      ? buildActionItemsFromSellerMetrics(seller.data)
      : [];

  const activityItems =
    hasOrg && customerId && txs.data
      ? transactionsToActivityItems(txs.data)
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

          {hasOrg && customerId ? (
            txs.isLoading ? (
              <HomeActivitySkeleton />
            ) : (
              <RecentActivityFeed items={activityItems} />
            )
          ) : hasOrg ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm font-medium text-foreground">
                Recent banking activity
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Connect banking to list your latest transactions here.
              </p>
              <Button asChild className="mt-4 rounded-xl" size="sm" variant="outline">
                <Link href="/integrations">Integrations</Link>
              </Button>
            </div>
          ) : null}
        </div>
        <div className="min-h-0 lg:col-span-5">
          <HomeReportsSection className="h-full" />
        </div>
      </div>
    </div>
  );
}
