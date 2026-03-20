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
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/5 px-8 py-16 text-center shadow-sm transition-all duration-300 ease-out",
        className
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl border border-dashed border-border/50 bg-background/60 backdrop-blur-sm">
        <GitMerge
          className="size-7 text-[var(--brand-primary)] opacity-80"
          aria-hidden
        />
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-1 max-w-md text-sm tracking-tight text-muted-foreground">
        {description}
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-6 rounded-xl border-border/40 transition-all duration-300 ease-out hover:bg-muted/50"
      >
        Sync bank feed
      </Button>
    </div>
  );
}
