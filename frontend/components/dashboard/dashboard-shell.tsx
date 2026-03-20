"use client";

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardTopNav } from "@/components/dashboard/dashboard-top-nav";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-theme flex min-h-screen bg-background text-foreground">
      <AppSidebar />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-background shadow-[inset_1px_0_0_var(--border)] before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-gradient-to-b before:from-[var(--brand-primary)]/25 before:via-border before:to-[var(--brand-primary)]/15">
        <DashboardTopNav />
        <main className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-[1600px] px-5 py-5 lg:px-6 lg:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
