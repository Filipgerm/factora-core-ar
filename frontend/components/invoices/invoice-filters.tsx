"use client";

import { Search, X, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SortColumn, SortDirection } from "@/lib/invoices/invoice-types";
import { COLUMN_LABELS } from "@/lib/config/invoice-constants";

interface InvoiceFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortColumn: SortColumn | null;
  sortDirection: SortDirection;
  sortableColumns: SortColumn[];
  onSort: (column: SortColumn) => void;
  onToggleSortDirection: () => void;
  onClearFilters: () => void;
}

export function InvoiceFilters({
  searchTerm,
  onSearchChange,
  sortColumn,
  sortDirection,
  sortableColumns,
  onSort,
  onToggleSortDirection,
  onClearFilters,
}: InvoiceFiltersProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search by invoice number, VAT, amount, or status..."
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
            {sortableColumns.map((column) => (
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
        {(searchTerm || sortColumn !== null) && (
          <Button variant="outline" onClick={onClearFilters} className="h-10">
            <X className="w-4 h-4 mr-2" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

