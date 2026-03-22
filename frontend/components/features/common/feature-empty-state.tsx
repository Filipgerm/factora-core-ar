import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FeatureEmptyState({
  icon: Icon,
  title,
  description,
  className,
  ctaHref,
  ctaLabel,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/40 px-8 py-16 text-center shadow-sm transition-all duration-200 dark:border-slate-700 dark:bg-slate-950/30",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        <Icon className="size-6" strokeWidth={1.5} aria-hidden />
      </div>
      <h3 className="mt-5 text-sm font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {ctaHref && ctaLabel ? (
        <Button asChild className="mt-6 rounded-xl transition-all duration-200" size="sm">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
