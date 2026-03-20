"use client";

import { ActionItemsList } from "@/components/features/home/action-items-list";
import { GreetingHeader } from "@/components/features/home/greeting-header";
import { MetricsOverview } from "@/components/features/home/metrics-overview";
import { RecentActivityFeed } from "@/components/features/home/recent-activity-feed";

export function HomeDashboardView() {
  return (
    <div className="space-y-8">
      <GreetingHeader />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start">
        <div className="space-y-8">
          <ActionItemsList />
          <MetricsOverview />
        </div>
        <aside className="lg:sticky lg:top-[4.5rem]">
          <RecentActivityFeed />
        </aside>
      </div>
    </div>
  );
}
