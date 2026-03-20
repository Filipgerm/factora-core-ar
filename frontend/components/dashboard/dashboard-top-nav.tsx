"use client";

import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";

const TITLE_BY_PREFIX: { prefix: string; title: string }[] = [
  { prefix: "/ledger", title: "Smart Ledger" },
  { prefix: "/integrations", title: "Integrations" },
  { prefix: "/reconciliation", title: "Reconciliation" },
  { prefix: "/ar-collections", title: "AR Collections" },
];

function titleForPath(pathname: string): string {
  const hit = TITLE_BY_PREFIX.find(
    (e) => pathname === e.prefix || pathname.startsWith(`${e.prefix}/`)
  );
  return hit?.title ?? "Dashboard";
}

export function DashboardTopNav() {
  const pathname = usePathname();
  const title = titleForPath(pathname);

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <h1 className="text-base font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <Badge
        variant="secondary"
        className="rounded-full border-amber-200/80 bg-amber-50 px-2.5 py-0.5 text-amber-900 transition-all duration-200 hover:bg-amber-100/90"
      >
        Demo mode
      </Badge>
    </header>
  );
}
