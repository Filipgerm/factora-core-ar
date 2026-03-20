"use client";

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardTopNav } from "@/components/dashboard/dashboard-top-nav";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopNav />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-[1600px] p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
