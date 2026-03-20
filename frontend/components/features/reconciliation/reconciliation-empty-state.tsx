import { GitMerge } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReconciliationEmptyStateProps {
  title: string;
  description: string;
  className?: string;
}

export function ReconciliationEmptyState({
  title,
  description,
  className,
}: ReconciliationEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-card/50 px-6 py-14 text-center transition-all duration-200 dark:border-slate-700",
        className
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full border border-dashed border-slate-300 bg-[var(--brand-primary-subtle)]/40 dark:border-slate-600">
        <GitMerge
          className="size-7 text-[var(--brand-primary)] opacity-80"
          aria-hidden
        />
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      <Button
        type="button"
        variant="outline"
        className="mt-6 transition-all duration-200"
      >
        Sync bank feed
      </Button>
    </div>
  );
}
