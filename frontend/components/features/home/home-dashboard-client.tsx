"use client";

import {
  buildActionItemsFromSellerMetrics,
  buildHomeKpiMetricsFromPlMetrics,
} from "@/lib/dashboard/build-home-from-api";
import { useAuthSession } from "@/lib/hooks/api/use-auth";
import {
  useDashboardPlMetricsQuery,
  useDashboardSellerMetricsQuery,
} from "@/lib/hooks/api/use-dashboard";
import { useResolvedSaltEdgeCustomerId } from "@/lib/hooks/api/use-saltedge";
import {
  mockHomeActionItems,
  mockHomeKpiMetrics,
} from "@/lib/mock-data/dashboard-mocks";

import { ActionItemsList } from "./action-items-list";
import { HomeDashboardGreeting } from "./home-dashboard-greeting";
import { HomeKpiBento } from "./home-kpi-bento";
import { HomeReportsSection } from "./home-reports-section";

export function HomeDashboardClient() {
  const { data: session } = useAuthSession();
  const { customerId } = useResolvedSaltEdgeCustomerId();
  const pl = useDashboardPlMetricsQuery(
    customerId ? { customerId, days: 30 } : null
  );
  const seller = useDashboardSellerMetricsQuery();

  const hasOrg = Boolean(session?.profile?.organization_id);

  const kpiMetrics =
    hasOrg && pl.data
      ? buildHomeKpiMetricsFromPlMetrics(pl.data)
      : mockHomeKpiMetrics;

  const actionItems =
    hasOrg && seller.data
      ? buildActionItemsFromSellerMetrics(seller.data)
      : mockHomeActionItems;

  const firstName =
    session?.profile?.username?.split(/\s+/)[0] ?? "there";

  return (
    <div className="flex min-h-0 flex-col gap-6 lg:gap-8">
      <HomeDashboardGreeting firstName={firstName} />
      <HomeKpiBento metrics={kpiMetrics} />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="min-h-0 lg:col-span-7">
          <ActionItemsList items={actionItems} />
        </div>
        <div className="min-h-0 lg:col-span-5">
          <HomeReportsSection className="h-full" />
        </div>
      </div>
    </div>
  );
}
