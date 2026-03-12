"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PLKpiSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="pl-kpi-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Skeleton className="h-8 w-40" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

