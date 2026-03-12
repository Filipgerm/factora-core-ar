import { Button } from "@/components/ui/button";

interface AlertsPaginationProps {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function AlertsPagination({
  currentPage,
  totalPages,
  startIndex,
  itemsPerPage,
  totalItems,
  onPageChange,
}: AlertsPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="bg-gray-50 px-4 sm:px-6 py-4 border-t border-gray-200">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-700 text-center sm:text-left">
          Showing {startIndex + 1} to{" "}
          {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems}{" "}
          results
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="hidden sm:inline-flex"
          >
            ««
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ‹
          </Button>
          <span className="text-sm text-gray-700 px-2 sm:px-3">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            ›
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="hidden sm:inline-flex"
          >
            »»
          </Button>
        </div>
      </div>
    </div>
  );
}

