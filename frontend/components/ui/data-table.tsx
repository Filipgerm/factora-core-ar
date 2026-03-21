"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getRowId?: (row: TData, index: number) => string;
  enableRowSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  onRowClick?: (row: TData, event: React.MouseEvent<HTMLTableRowElement>) => void;
  getRowClassName?: (row: TData) => string | undefined;
  emptyLabel?: string;
  className?: string;
};

export function DataTable<TData, TValue>({
  columns,
  data,
  getRowId,
  enableRowSelection,
  rowSelection,
  onRowSelectionChange,
  onRowClick,
  getRowClassName,
  emptyLabel = "No results.",
  className,
}: DataTableProps<TData, TValue>) {
  const [internalSelection, setInternalSelection] =
    React.useState<RowSelectionState>({});
  const resolvedSelection = rowSelection ?? internalSelection;
  const resolvedOnSelectionChange =
    onRowSelectionChange ?? setInternalSelection;

  const table = useReactTable({
    data,
    columns,
    ...(enableRowSelection
      ? {
          state: { rowSelection: resolvedSelection },
          onRowSelectionChange: resolvedOnSelectionChange,
        }
      : {}),
    enableRowSelection: enableRowSelection ?? false,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
  });

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-background",
        className
      )}
    >
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="border-slate-200/80 hover:bg-transparent dark:border-slate-800"
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="h-9 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
                className={cn(
                  "cursor-pointer border-slate-100 transition-colors duration-200 hover:bg-slate-50/90 dark:border-slate-800/80 dark:hover:bg-slate-900/40",
                  row.getIsSelected() && "bg-slate-50 dark:bg-slate-900/50",
                  getRowClassName?.(row.original)
                )}
                onClick={(e) => {
                  const t = e.target as HTMLElement;
                  if (
                    t.closest("button") ||
                    t.closest('[role="checkbox"]') ||
                    t.closest("input")
                  ) {
                    return;
                  }
                  onRowClick?.(row.original, e);
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="py-2.5 text-[13px] tracking-tight"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                {emptyLabel}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
