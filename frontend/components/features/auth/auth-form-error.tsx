"use client";

import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type AuthFormErrorProps = {
  title: string;
  description: string;
  className?: string;
};

/**
 * Inline auth error with a calm, premium treatment (subtle border, soft tint, motion).
 */
export function AuthFormError({ title, description, className }: AuthFormErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        "animate-in fade-in zoom-in-[0.99] slide-in-from-top-1 duration-300 ease-out",
        "rounded-xl border border-rose-200/80 bg-gradient-to-b from-rose-50/95 to-white/90 px-4 py-3.5 text-rose-950 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        "dark:border-rose-900/45 dark:from-rose-950/50 dark:to-rose-950/20 dark:text-rose-50",
        className
      )}
    >
      <div className="flex gap-3">
        <AlertCircle
          className="mt-0.5 size-4 shrink-0 text-rose-500 transition-colors duration-200 dark:text-rose-400"
          aria-hidden
        />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium tracking-tight text-rose-950 dark:text-rose-50">
            {title}
          </p>
          <p className="text-[13px] leading-relaxed text-rose-800/90 dark:text-rose-200/85">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
