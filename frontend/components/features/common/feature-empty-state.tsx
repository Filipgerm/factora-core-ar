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
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  ctaHref?: string;
  ctaLabel?: string;
  /** Primary button when navigation should not use a ``Link`` (e.g. open sheet). */
  action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
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
      {action || (ctaHref && ctaLabel) ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {action ? (
            <Button
              type="button"
              className="rounded-xl transition-all duration-200"
              size="sm"
              disabled={action.disabled}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ) : null}
          {ctaHref && ctaLabel ? (
            <Button asChild className="rounded-xl transition-all duration-200" size="sm">
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
