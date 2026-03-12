import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  DollarSign,
  Shield,
  Building2,
  Mail,
} from "lucide-react";
import { timeAgo } from "@/lib/utils/buyer-dashboard";
import type { BuyerCreditLimitRequest } from "@/lib/types/buyer-dashboard";

type NotificationsProps = {
  acceptedRequests: BuyerCreditLimitRequest[];
  rejectedRequests: BuyerCreditLimitRequest[];
  loading?: boolean;
};

const NotificationsSkeleton = () => (
  <div className="grid grid-cols-1 gap-6">
    {[1, 2].map((key) => (
      <Card key={key} className="bd-notif">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            <div className="h-5 w-8 bg-muted animate-pulse rounded-full" />
          </div>
          <div className="h-4 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex items-start justify-between rounded-lg border border-muted bg-muted/40 p-3"
            >
              <div className="space-y-2 w-full">
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    ))}
  </div>
);

export function Notifications({
  acceptedRequests,
  rejectedRequests,
  loading = false,
}: NotificationsProps) {
  const [expanded, setExpanded] = useState(false);

  const renderRequest = (
    request: BuyerCreditLimitRequest,
    tone: "success" | "error"
  ) => {
    const isCreditLimit = request.requestType === "credit limit";
    const Icon = isCreditLimit ? DollarSign : Shield;
    const colorClass = tone === "success" ? "text-emerald-700" : "text-rose-700";
    const borderClass =
      tone === "success"
        ? "border-emerald-200 bg-emerald-50/30"
        : "border-rose-200 bg-rose-50/30";

    // Generate mock supplier email based on name
    const supplierEmail = request.acceptedBy
      ? `finance@${request.acceptedBy.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
      : 'finance@kleemann.com';

    return (
      <div
        key={request.id}
        className={`group flex flex-col rounded-lg border p-4 hover:shadow-sm transition-all ${borderClass}`}
      >
        <div className="flex items-start justify-between w-full">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg bg-white shadow-sm border ${tone === 'success' ? 'border-emerald-100' : 'border-rose-100'}`}>
              <Icon className={`h-5 w-5 ${colorClass}`} />
            </div>
            <div>
              <p className="text-sm text-gray-900">
                <span className="font-bold text-base">
                  {tone === "success" ? request.acceptedBy : request.rejectedBy}
                </span>{" "}
                {tone === "success" ? "approved" : "rejected"} your account for{" "}
                <span className="font-medium">{request.requestType}</span>
              </p>
              {(request.acceptedAt || request.rejectedAt) && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  {request.acceptedAt
                    ? timeAgo(request.acceptedAt)
                    : request.rejectedAt
                      ? timeAgo(request.rejectedAt)
                      : ""}
                </p>
              )}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* NEW: Detailed Data Grid for Success Tone */}
        {tone === "success" && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-3.5 rounded-lg border border-emerald-100/60 shadow-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Supplier
              </p>
              <p className="text-sm font-semibold text-gray-900 truncate" title={request.acceptedBy}>{request.acceptedBy}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Contact
              </p>
              <p className="text-sm font-medium text-blue-600 truncate" title={supplierEmail}>{supplierEmail}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Payment Terms</p>
              <p className="text-sm font-semibold text-gray-900">Net 30</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Credit Limit</p>
              <p className="text-sm font-bold text-emerald-600">
                {typeof request.totalAmount === "number"
                  ? `€${request.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 0 })}`
                  : "Approved"}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) return <NotificationsSkeleton />;

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 gap-6">
        <Card className="bd-notif bg-white border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-base">Supplier Approvals</CardTitle>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className="rounded-full bg-emerald-100 text-emerald-800"
                >
                  {acceptedRequests.length}
                </Badge>
                {acceptedRequests.length > 3 && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-sm text-brand-primary hover:underline"
                  >
                    {expanded ? "See less" : "See all"}
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {acceptedRequests.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No accepted requests yet.</p>
            ) : (
              (expanded ? acceptedRequests : acceptedRequests.slice(0, 3)).map(
                (request) => renderRequest(request, "success")
              )
            )}
          </CardContent>
        </Card>

        {rejectedRequests.length > 0 && (
          <Card className="bd-notif bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-600" />
                  <CardTitle className="text-base">Rejected Requests</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className="rounded-full bg-rose-100 text-rose-800"
                  >
                    {rejectedRequests.length}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(expanded ? rejectedRequests : rejectedRequests.slice(0, 3)).map(
                (request) => renderRequest(request, "error")
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
