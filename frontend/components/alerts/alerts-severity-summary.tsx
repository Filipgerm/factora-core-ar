import { Flame, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AlertsSeveritySummaryProps {
  highCount: number;
  mediumCount: number;
  lowCount: number;
  loading?: boolean;
}

export function AlertsSeveritySummary({
  highCount,
  mediumCount,
  lowCount,
  loading = false,
}: AlertsSeveritySummaryProps) {
  if (loading) {
    return <AlertsSeveritySummarySkeleton />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <Card className="bg-white border border-red-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="py-3 flex flex-row items-center gap-3">
          <div className="p-2 rounded-lg bg-red-50">
            <Flame className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-sm text-gray-600">High</div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{highCount}</div>
        </CardContent>
      </Card>
      <Card className="bg-white border border-amber-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="py-3 flex flex-row items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-50">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-sm text-gray-600">Medium</div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{mediumCount}</div>
        </CardContent>
      </Card>
      <Card className="bg-white border border-green-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="py-3 flex flex-row items-center gap-3">
          <div className="p-2 rounded-lg bg-green-50">
            <Info className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-sm text-gray-600">Low</div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{lowCount}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function AlertsSeveritySummarySkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {[1, 2, 3].map((key) => (
        <Card
          key={key}
          className="bg-white border border-gray-200 rounded-xl shadow-sm"
        >
          <CardHeader className="py-3 flex flex-row items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-lg" />
            <Skeleton className="h-4 w-16" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

