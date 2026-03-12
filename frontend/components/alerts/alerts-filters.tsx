"use client";

import { Search, X, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  COLUMN_LABELS,
  type SortColumn,
  type SortDirection,
} from "@/lib/utils/alerts";
import { Skeleton } from "@/components/ui/skeleton";

interface AlertsFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortColumn: SortColumn | null;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  onToggleSortDirection: () => void;
  customerFilter?: string;
  onClearFilters: () => void;
  onRemoveCustomerFilter: () => void;
  loading?: boolean;
}

export function AlertsFilters({
  searchTerm,
  onSearchChange,
  sortColumn,
  sortDirection,
  onSort,
  onToggleSortDirection,
  customerFilter,
  onClearFilters,
  onRemoveCustomerFilter,
  loading = false,
}: AlertsFiltersProps) {
  if (loading) {
    return <AlertsFiltersSkeleton />;
  }

  const hasActiveFilters = searchTerm || sortColumn !== null || customerFilter;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search by customer or alert..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
          />
        </div>

        {/* Sort By */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full lg:w-[220px] h-10 bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-600"
            >
              Sort By:{" "}
              {sortColumn
                ? `${COLUMN_LABELS[sortColumn]} ${
                    sortDirection === "asc" ? "↑" : "↓"
                  }`
                : "None"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Sort By Column</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(
              [
                "customer",
                "title",
                "description",
                "date",
              ] as SortColumn[]
            ).map((column) => (
              <DropdownMenuItem
                key={column}
                onClick={() => onSort(column)}
                className={
                  sortColumn === column ? "bg-slate-100 font-medium" : ""
                }
              >
                {COLUMN_LABELS[column]}
                {sortColumn === column && (
                  <span className="ml-auto">
                    {sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
            {sortColumn && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Sort Direction</DropdownMenuLabel>
                <DropdownMenuItem onClick={onToggleSortDirection}>
                  {sortDirection === "asc" ? (
                    <>
                      <ArrowDown className="mr-2 h-4 w-4" />
                      Descending
                    </>
                  ) : (
                    <>
                      <ArrowUp className="mr-2 h-4 w-4" />
                      Ascending
                    </>
                  )}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="outline" onClick={onClearFilters} className="h-10">
            <X className="w-4 h-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Customer Filter Indicator */}
      {customerFilter && (
        <div className="mt-3 flex items-center gap-2">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Filtered by customer
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemoveCustomerFilter}
            className="h-6 text-xs"
          >
            Remove filter
          </Button>
        </div>
      )}
    </div>
  );
}

function AlertsFiltersSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex flex-col lg:flex-row gap-4">
        <Skeleton className="flex-1 h-10" />
        <Skeleton className="w-full lg:w-[220px] h-10" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  );
}

