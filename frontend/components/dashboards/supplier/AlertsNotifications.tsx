import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { AlertNotification } from "@/lib/types/supplier-dashboard";
import {
  getImpactBadgeConfig,
  getRiskSeverity,
  timeAgo,
} from "@/lib/utils/supplier-dashboard";

type AlertsNotificationsProps = {
  items: AlertNotification[];
  badgeCount: number;
  canExpand: boolean;
  expanded: boolean;
  onToggle: () => void;
  onClick: (notification: AlertNotification) => void;
  loading?: boolean;
};

const AlertsSkeleton = () => (
  <Card className="home-notif bg-white border-slate-200">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="h-5 w-24 bg-muted animate-pulse rounded" />
        <div className="h-5 w-10 bg-muted animate-pulse rounded-full" />
      </div>
      <div className="h-4 w-40 bg-muted animate-pulse rounded" />
    </CardHeader>
    <CardContent className="space-y-3">
      {[1, 2, 3].map((key) => (
        <div
          key={key}
          className="flex items-start justify-between rounded-lg border border-slate-200 p-3 bg-muted/40"
        >
          <div className="space-y-2 w-full">
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
);

export function AlertsNotifications({
  items,
  badgeCount,
  canExpand,
  expanded,
  onToggle,
  onClick,
  loading = false,
}: AlertsNotificationsProps) {
  if (loading) return <AlertsSkeleton />;

  return (
    <Card className="home-notif bg-white border-slate-200 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-base">Alerts</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="rounded-full">
              {badgeCount}
            </Badge>
            {canExpand && (
              <button
                onClick={onToggle}
                className="text-sm text-brand-primary hover:underline"
              >
                {expanded ? "See less" : "See all"}
              </button>
            )}
          </div>
        </div>
        <CardDescription className="text-slate-600">
          Live monitoring notifications and watchlist hits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">All clear for now.</p>
        ) : (
          items.map((n) => {
            const impact = n.details
              ? (n.details.toLowerCase() as "low" | "medium" | "high")
              : (getRiskSeverity(n.alertType).toLowerCase() as "low" | "medium" | "high");
            const badgeConfig = getImpactBadgeConfig(impact);
            return (
              <div
                key={n.id}
                className="group flex items-start justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => onClick(n)}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-900">
                      <span className="font-semibold">{n.businessName}</span>:{" "}
                      {n.alertType.replaceAll("_", " ")}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {badgeConfig && (
                        <Badge variant="secondary" className={badgeConfig.className}>
                          {badgeConfig.label}
                        </Badge>
                      )}
                      <p className="text-xs text-slate-500">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

