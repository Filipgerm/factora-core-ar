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
import { useToast } from "@/hooks/use-toast";
import { isApiError } from "@/lib/api/types";
import { useAuthSession } from "@/lib/hooks/api/use-auth";
import {
  useOrganizationsListQuery,
  useSwitchOrganizationMutation,
} from "@/lib/hooks/api/use-organizations";
import { useOrganizationMeQuery } from "@/lib/hooks/api/use-organization";
import { cn } from "@/lib/utils";

export function OrganizationSwitcher({ className }: { className?: string }) {
  const { toast } = useToast();
  const { data: session } = useAuthSession();
  const list = useOrganizationsListQuery();
  const orgMe = useOrganizationMeQuery();
  const switchOrg = useSwitchOrganizationMutation();

  const hasToken = Boolean(session?.hasToken);
  const currentMembership = list.data?.find((m) => m.is_current);

  const label = (() => {
    if (!hasToken) return "Sign in to continue";
    if (list.isLoading) return null;
    if (list.isError) return "Could not load organizations";
    if (currentMembership?.name) return currentMembership.name;
    if (orgMe.data?.name) return orgMe.data.name;
    if ((list.data?.length ?? 0) === 0) return "Complete organization setup";
    return "Organization";
  })();

  function onSelectOrg(organizationId: string, isCurrent: boolean) {
    if (isCurrent || switchOrg.isPending) return;
    switchOrg.mutate(organizationId, {
      onError: (err) => {
        toast({
          title: "Could not switch organization",
          description: isApiError(err) ? err.message : "Request failed",
          variant: "destructive",
        });
      },
    });
  }

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
            {list.isLoading ? (
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
        {hasToken && list.isSuccess && (list.data?.length ?? 0) > 0 ? (
          (list.data ?? []).map((m) => (
            <DropdownMenuItem
              key={m.organization_id}
              className="gap-2 text-sm transition-all duration-200"
              disabled={m.is_current || switchOrg.isPending}
              onSelect={(e) => {
                e.preventDefault();
                onSelectOrg(m.organization_id, m.is_current);
              }}
            >
              <Building2 className="size-3.5 opacity-70" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{m.name}</span>
              {m.is_current ? (
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Current
                </span>
              ) : null}
            </DropdownMenuItem>
          ))
        ) : hasToken && list.isSuccess ? (
          <DropdownMenuItem
            disabled
            className="text-xs text-muted-foreground"
            onSelect={(e) => e.preventDefault()}
          >
            Create your org via POST /v1/organization/
          </DropdownMenuItem>
        ) : null}
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
