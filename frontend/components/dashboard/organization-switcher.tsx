"use client";

import Image from "next/image";
import { Building2, ChevronsUpDown, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/lib/hooks/api/use-auth";
import { useOrganizationMeQuery } from "@/lib/hooks/api/use-organization";
import { cn } from "@/lib/utils";

export function OrganizationSwitcher({ className }: { className?: string }) {
  const { data: session } = useAuthSession();
  const org = useOrganizationMeQuery();

  const hasToken = Boolean(session?.hasToken);
  const hasOrgInJwt = Boolean(session?.profile?.organization_id);

  const label = (() => {
    if (!hasToken) return "Sign in to continue";
    if (org.isLoading) return null;
    if (org.data?.name) return org.data.name;
    if (!hasOrgInJwt) return "Complete organization setup";
    if (org.isError) return "Could not load organization";
    return "Organization";
  })();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "h-auto w-full justify-start gap-2 rounded-lg px-2 py-2 text-left font-medium hover:bg-slate-100/90 dark:hover:bg-slate-800/80",
            className
          )}
        >
          <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200/80 bg-white dark:border-slate-700 dark:bg-background">
            <Image
              src="/placeholder-logo.svg"
              alt=""
              width={24}
              height={24}
              className="object-contain"
            />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">
            {org.isLoading ? (
              <Skeleton className="h-4 w-28" />
            ) : (
              (label ?? "…")
            )}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" sideOffset={6}>
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Organization
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {org.data ? (
          <DropdownMenuItem
            className="gap-2 text-sm transition-all duration-200"
            onSelect={(e) => e.preventDefault()}
          >
            <Building2 className="size-3.5 opacity-70" aria-hidden />
            {org.data.name}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            disabled
            className="text-xs text-muted-foreground"
            onSelect={(e) => e.preventDefault()}
          >
            {hasToken && !hasOrgInJwt
              ? "Create your org via API POST /v1/organization/"
              : "No organization loaded"}
          </DropdownMenuItem>
        )}
        {/* TODO: Phase 2 Backend — multi-tenant org list + switch-active-org (new JWT); until then only one org from JWT. */}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 text-sm transition-all duration-200"
          onSelect={(e) => e.preventDefault()}
        >
          <Settings className="size-3.5 opacity-70" aria-hidden />
          Organization settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
