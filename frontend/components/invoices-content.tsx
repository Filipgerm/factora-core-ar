"use client";

// Re-export from the refactored component
export { InvoicesContent } from "./invoices/invoices-content";
export type {
  Invoice,
  RequestStatus,
  SortColumn,
  SortDirection,
} from "@/lib/invoices/invoice-types";
