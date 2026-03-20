"use client";

import { ActionItemsList } from "@/components/features/home/action-items-list";
import { HomeKpiBento } from "@/components/features/home/home-kpi-bento";
import { RecentActivityFeed } from "@/components/features/home/recent-activity-feed";

export function HomeDashboardView() {
  return (
    <div className="flex min-h-0 flex-col gap-6 lg:gap-8">
      <HomeKpiBento />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="min-h-0 lg:col-span-7">
          <ActionItemsList />
        </div>
        <div className="min-h-0 lg:col-span-5">
          <RecentActivityFeed />
        </div>
      </div>
    </div>
  );
}
