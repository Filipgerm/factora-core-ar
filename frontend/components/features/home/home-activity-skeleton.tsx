"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function HomeActivitySkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-5 dark:border-slate-800">
        <Skeleton className="h-3 w-28 rounded-md" />
        <Skeleton className="mt-2 h-3 w-48 rounded-md" />
      </div>
      <div className="divide-y divide-slate-100 p-2 dark:divide-slate-800">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 px-4 py-3">
            <Skeleton className="size-8 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2 py-0.5">
              <Skeleton className="h-3 w-full max-w-md rounded-md" />
              <Skeleton className="h-2.5 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
