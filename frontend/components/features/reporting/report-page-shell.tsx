import type { ReactNode } from "react";

import { ReportExportMenu } from "@/components/features/reporting/report-export-menu";
import { cn } from "@/lib/utils";

export function ReportPageShell({
  title,
  subtitle,
  exportFileStem,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  exportFileStem: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:p-8 dark:border-slate-800 dark:bg-background",
        className
      )}
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 max-w-2xl text-sm tracking-tight text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        <ReportExportMenu fileStem={exportFileStem} className="shrink-0" />
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
