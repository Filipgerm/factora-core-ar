import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AlertsEmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
}

export function AlertsEmptyState({
  hasFilters,
  onClearFilters,
}: AlertsEmptyStateProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-12 text-center shadow-sm">
      <div className="text-gray-400 mb-4">
        <AlertCircle className="w-12 h-12 mx-auto" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No alerts found
      </h3>
      <p className="text-gray-600 mb-4">
        {hasFilters
          ? "Try adjusting your search or filters."
          : "You're all caught up! No alerts at this time."}
      </p>
      {hasFilters && (
        <Button variant="outline" onClick={onClearFilters}>
          Clear Filters
        </Button>
      )}
    </div>
  );
}

