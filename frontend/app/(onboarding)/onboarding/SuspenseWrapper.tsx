"use client";

import { Suspense, ReactNode } from "react";

interface SuspenseWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function SuspenseWrapper({ children, fallback }: SuspenseWrapperProps) {
  return (
    <Suspense
      fallback={
        fallback || (
          <div className="flex items-center justify-center h-32">
            Loading...
          </div>
        )
      }
    >
      {children}
    </Suspense>
  );
}
