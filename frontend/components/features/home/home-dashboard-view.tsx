"use client";

import { ActionItemsList } from "@/components/features/home/action-items-list";
import { HomeHeroCard } from "@/components/features/home/home-hero-card";
import { HomeKpiBento } from "@/components/features/home/home-kpi-bento";
import { RecentActivityFeed } from "@/components/features/home/recent-activity-feed";

export function HomeDashboardView() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-5 lg:gap-6">
      <HomeHeroCard />

      <HomeKpiBento />

      <div className="col-span-12 lg:col-span-7">
        <ActionItemsList />
      </div>
      <div className="col-span-12 lg:col-span-5">
        <RecentActivityFeed className="lg:sticky lg:top-[4.75rem]" />
      </div>
    </div>
  );
}
