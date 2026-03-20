"use client";

import { CheckCircle2, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MockCounterparty } from "@/lib/mock-data/dashboard-mocks";

export function GemiStatusBadge({ counterparty }: { counterparty: MockCounterparty }) {
  if (counterparty.country !== "GR") {
    return (
      <span className="text-xs text-muted-foreground tabular-nums">—</span>
    );
  }

  if (counterparty.gemiVerified) {
    const badge = (
      <Badge variant="gemiVerified" className="gap-1 transition-all duration-200">
        <CheckCircle2 className="size-3" aria-hidden />
        GEMI
      </Badge>
    );
    if (counterparty.gemiNumber) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Registry {counterparty.gemiNumber}
          </TooltipContent>
        </Tooltip>
      );
    }
    return badge;
  }

  return (
    <Badge variant="gemiPending" className="gap-1 transition-all duration-200">
      <Shield className="size-3" aria-hidden />
      Pending
    </Badge>
  );
}
