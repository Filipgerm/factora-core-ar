import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronRight, DollarSign, Shield } from "lucide-react";
import type { RequestNotification } from "@/lib/types/supplier-dashboard";
import { timeAgo } from "@/lib/utils/supplier-dashboard";

type RequestsNotificationsProps = {
  items: RequestNotification[];
  badgeCount: number;
  canExpand: boolean;
  expanded: boolean;
  onToggle: () => void;
  onClick: (notification: RequestNotification) => void;
  loading?: boolean;
};

const RequestsSkeleton = () => (
  <Card className="home-notif bg-white border-slate-200">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
        <div className="h-5 w-10 bg-muted animate-pulse rounded-full" />
      </div>
      <div className="h-4 w-52 bg-muted animate-pulse rounded" />
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

export function RequestsNotifications({
  items,
  badgeCount,
  canExpand,
  expanded,
  onToggle,
  onClick,
  loading = false,
}: RequestsNotificationsProps) {
  if (loading) return <RequestsSkeleton />;

  return (
    <Card className="home-notif bg-white border-slate-200 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand-primary" />
            <CardTitle className="text-base">Financing &amp; Insurance</CardTitle>
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
          Customer requests requiring review and action.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No open requests.</p>
        ) : (
          items.map((n) => {
            const Icon = n.requestType === "credit limit" ? DollarSign : Shield;
            return (
              <div
                key={n.id}
                className="group flex items-start justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => onClick(n)}
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 text-brand-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-900">
                      <span className="font-semibold">{n.businessName}</span>{" "}
                      requested <span className="font-medium">{n.requestType}</span>
                      {n.invoiceCount && n.invoiceCount > 0
                        ? ` for ${n.invoiceCount} invoice${n.invoiceCount !== 1 ? "s" : ""
                        }`
                        : ""}
                      {typeof n.amount === "number"
                        ? ` totaling €${n.amount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                        : ""}
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

