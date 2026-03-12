"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function PLTableSkeleton() {
  return (
    <div className="pl-detailed-card bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {[1, 2, 3, 4].map((i) => (
                <th key={i} className="px-4 sm:px-6 py-4 text-left">
                  <Skeleton className="h-4 w-24" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <tr key={i}>
                {[1, 2, 3, 4].map((j) => (
                  <td key={j} className="px-4 sm:px-6 py-4">
                    <Skeleton className="h-4 w-20" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

