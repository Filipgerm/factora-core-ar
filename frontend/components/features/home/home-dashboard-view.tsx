"use client";

import { ActionItemsList } from "@/components/features/home/action-items-list";
import { HomeDashboardGreeting } from "@/components/features/home/home-dashboard-greeting";
import { HomeKpiBento } from "@/components/features/home/home-kpi-bento";
import { HomeReportsSection } from "@/components/features/home/home-reports-section";

export function HomeDashboardView() {
  return (
    <div className="flex min-h-0 flex-col gap-6 lg:gap-8">
      <HomeDashboardGreeting />
      <HomeKpiBento />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="min-h-0 lg:col-span-7">
          <ActionItemsList />
        </div>
        <div className="min-h-0 lg:col-span-5">
          <HomeReportsSection className="h-full" />
        </div>
      </div>
    </div>
  );
}
