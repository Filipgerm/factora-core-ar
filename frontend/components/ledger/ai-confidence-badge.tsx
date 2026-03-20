import { Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { AiConfidence } from "@/lib/mock-data/dashboard-mocks";

export function AiConfidenceBadge({ level }: { level: AiConfidence }) {
  switch (level) {
    case "high":
      return (
        <span className="inline-flex rounded-md bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/60 p-px shadow-[0_0_0_1px_rgba(99,102,241,0.08)] dark:from-indigo-950/50 dark:via-slate-900 dark:to-violet-950/40">
          <Badge
            variant="aiHigh"
            className="gap-0.5 border-0 bg-white/90 shadow-none transition-all duration-200 dark:bg-slate-950/60"
          >
            <Zap className="size-3" aria-hidden />
            High
          </Badge>
        </span>
      );
    case "medium":
      return (
        <span className="inline-flex rounded-md bg-gradient-to-br from-indigo-50/50 to-white p-px shadow-[0_0_0_1px_rgba(99,102,241,0.06)] dark:from-indigo-950/30 dark:to-slate-900">
          <Badge
            variant="aiMedium"
            className="border-0 bg-white/90 shadow-none transition-all duration-200 dark:bg-slate-950/50"
          >
            Medium
          </Badge>
        </span>
      );
    case "low":
      return (
        <Badge variant="aiLow" className="transition-all duration-200">
          Review
        </Badge>
      );
    default:
      return null;
  }
}
