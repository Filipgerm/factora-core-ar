"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function TemplatesListSkeleton() {
  return (
    <section className="flex flex-col flex-1 min-h-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between flex-shrink-0 mb-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="flex flex-col gap-3 flex-1 overflow-y-auto min-h-0">
        {[1, 2, 3].map((key) => (
          <div
            key={key}
            className="rounded-xl border border-gray-200 p-4 flex-shrink-0"
          >
            <div className="flex items-start gap-3 mb-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        ))}
      </div>
    </section>
  );
}

