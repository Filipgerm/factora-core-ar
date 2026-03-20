import { Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { AiConfidence } from "@/lib/mock-data/dashboard-mocks";

export function AiConfidenceBadge({ level }: { level: AiConfidence }) {
  switch (level) {
    case "high":
      return (
        <Badge variant="aiHigh" className="gap-0.5 transition-all duration-200">
          <Zap className="size-3" aria-hidden />
          High
        </Badge>
      );
    case "medium":
      return (
        <Badge variant="aiMedium" className="transition-all duration-200">
          Medium
        </Badge>
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
