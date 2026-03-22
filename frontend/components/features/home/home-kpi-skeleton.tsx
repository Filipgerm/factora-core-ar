"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function HomeKpiBentoSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch lg:gap-4">
      <div className="lg:col-span-5">
        <Skeleton className="h-[min(188px,22vw)] w-full rounded-2xl transition-all duration-200" />
      </div>
      <div className="lg:col-span-5">
        <Skeleton className="h-[min(188px,22vw)] w-full rounded-2xl transition-all duration-200" />
      </div>
      <div className="flex min-h-0 flex-col gap-2 lg:col-span-2 lg:min-h-[188px]">
        <Skeleton className="h-full min-h-[88px] flex-1 rounded-xl transition-all duration-200" />
        <Skeleton className="h-full min-h-[88px] flex-1 rounded-xl transition-all duration-200" />
      </div>
    </div>
  );
}
