import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, ChevronRight } from "lucide-react";
import type { StatusNotification } from "@/lib/types/supplier-dashboard";
import { timeAgo } from "@/lib/utils/supplier-dashboard";

type StatusNotificationsProps = {
  items: StatusNotification[];
  badgeCount: number;
  canExpand: boolean;
  expanded: boolean;
  onToggle: () => void;
  onClick: (notification: StatusNotification) => void;
  loading?: boolean;
};

const StatusSkeleton = () => (
  <Card className="home-notif bg-white border-slate-200">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        <div className="h-5 w-10 bg-muted animate-pulse rounded-full" />
      </div>
      <div className="h-4 w-48 bg-muted animate-pulse rounded" />
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

export function StatusNotifications({
  items,
  badgeCount,
  canExpand,
  expanded,
  onToggle,
  onClick,
  loading = false,
}: StatusNotificationsProps) {
  if (loading) return <StatusSkeleton />;

  return (
    <Card className="home-notif bg-white border-slate-200 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-base">Status Updates</CardTitle>
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
          Onboarding Status of your customers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No status changes.</p>
        ) : (
          items.map((n) => {
            const display =
              n.oldStatus === "new" && n.newStatus === "onboarded"
                ? "moved from new to pending."
                : `moved from ${n.oldStatus} to ${n.newStatus}.`;
            return (
              <div
                key={n.id}
                className="group flex items-start justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => onClick(n)}
              >
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-900">
                      <span className="font-semibold">{n.businessName}</span>{" "}
                      {display}
                    </p>
                    <p className="text-xs text-slate-500">{timeAgo(n.createdAt)}</p>
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

