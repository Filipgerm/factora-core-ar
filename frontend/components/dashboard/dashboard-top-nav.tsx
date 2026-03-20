"use client";

import { mockHomeUserFirstName } from "@/lib/mock-data/dashboard-mocks";

export function DashboardTopNav() {
  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-border/40 bg-background/60 px-6 py-5 backdrop-blur-md">
      <h1 className="text-3xl font-semibold tracking-tighter text-foreground md:text-4xl">
        Hi there,{" "}
        <span className="bg-gradient-to-r from-[var(--brand-primary)] to-teal-600/90 bg-clip-text text-transparent dark:to-teal-400/90">
          {mockHomeUserFirstName}
        </span>
      </h1>
    </header>
  );
}
