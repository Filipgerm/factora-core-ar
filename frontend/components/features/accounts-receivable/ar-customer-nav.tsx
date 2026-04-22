"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function ArCustomerCrumbBar({
  segments,
}: {
  segments: { label: string; href?: string }[];
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
    >
      {segments.map((s, i) => (
        <span key={`${s.label}-${i}`} className="inline-flex items-center gap-1">
          {i > 0 ? (
            <ChevronRight className="size-3 shrink-0 opacity-50" aria-hidden />
          ) : null}
          {s.href ? (
            <Link
              href={s.href}
              className="transition-colors duration-200 hover:text-[color:var(--brand-primary)]"
            >
              {s.label}
            </Link>
          ) : (
            <span className="font-semibold tracking-tight text-foreground">
              {s.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
