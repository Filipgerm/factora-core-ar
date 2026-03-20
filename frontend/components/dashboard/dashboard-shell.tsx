"use client";

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardTopNav } from "@/components/dashboard/dashboard-top-nav";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-theme flex min-h-screen bg-slate-50 text-foreground">
      <AppSidebar />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <DashboardTopNav />
        <main className="min-h-0 flex-1 overflow-auto bg-slate-50">
          <div className="mx-auto max-w-[1600px] px-5 py-5 lg:px-6 lg:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
