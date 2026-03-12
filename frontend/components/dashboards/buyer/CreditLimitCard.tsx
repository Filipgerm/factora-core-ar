import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

type CreditLimitCardProps = {
  creditLimit: number;
  status: "onboarded" | "pending" | "new" | string;
  loading?: boolean;
};

const LimitSkeleton = () => (
  <div className="space-y-4">
    <div className="h-6 w-24 bg-muted animate-pulse rounded" />
    <div className="border-t border-gray-200"></div>
    <div className="space-y-2">
      <div className="h-3 w-16 bg-muted animate-pulse rounded" />
      <div className="h-6 w-20 bg-muted animate-pulse rounded" />
    </div>
  </div>
);

const statusBadgeClass: Record<string, string> = {
  onboarded: "bg-green-100 text-green-800",
  pending: "bg-orange-100 text-orange-800",
  new: "bg-blue-100 text-blue-800",
};

const getStatusLabel = (status: CreditLimitCardProps["status"]): string => {
  if (status === "onboarded") return "APPROVED";
  if (status === "pending") return "PENDING";
  return "NEW";
};

export function CreditLimitCard({
  creditLimit,
  status,
  loading = false,
}: CreditLimitCardProps) {
  return (
    <Card className="bd-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Credit Limit</CardTitle>
        <CheckCircle className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <LimitSkeleton />
        ) : (
          <>
            <div>
              <div className="text-2xl font-bold">
                €{creditLimit.toLocaleString()}
              </div>
            </div>
            <div className="border-t border-gray-200"></div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Status</p>
              <Badge className={statusBadgeClass[status] ?? statusBadgeClass.new}>
                {getStatusLabel(status)}
              </Badge>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

