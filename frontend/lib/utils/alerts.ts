import type { Alert, AlertType, AlertCategory } from "@/lib/alerts-data";

export type SortColumn = "customer" | "title" | "description" | "date";
export type SortDirection = "asc" | "desc";

export const COLUMN_LABELS: Record<SortColumn, string> = {
  customer: "Customer",
  title: "Alert",
  description: "Details",
  date: "Date",
};

export const ITEMS_PER_PAGE = 10;

export interface SeverityBadgeConfig {
  label: string;
  className: string;
}

export const SEVERITY_CONFIG: Record<AlertType, SeverityBadgeConfig> = {
  critical: {
    label: "High",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  warning: {
    label: "Medium",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  info: {
    label: "Low",
    className: "bg-green-100 text-green-800 border-green-200",
  },
};

export interface ImpactBadgeConfig {
  label: string;
  className: string;
}

export const IMPACT_CONFIG: Record<"low" | "medium" | "high", ImpactBadgeConfig> = {
  low: { label: "Low", className: "bg-green-100 text-green-800" },
  medium: { label: "Medium", className: "bg-amber-100 text-amber-800" },
  high: { label: "High", className: "bg-red-100 text-red-800" },
};

export const CATEGORY_LABELS: Record<AlertCategory, string> = {
  overdue_invoice: "Overdue Invoice",
  credit_limit: "Credit Limit",
  payment_trend: "Payment Trend",
  discount_opportunity: "Discount Opportunity",
};

export function formatAlertDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getSeverityBadgeConfig(type: AlertType): SeverityBadgeConfig {
  return SEVERITY_CONFIG[type];
}

export function getImpactBadgeConfig(
  impact: "low" | "medium" | "high"
): ImpactBadgeConfig {
  return IMPACT_CONFIG[impact];
}

export function getCategoryLabel(category: AlertCategory): string {
  return CATEGORY_LABELS[category];
}

export function sortAlerts(
  alerts: Alert[],
  column: SortColumn | null,
  direction: SortDirection
): Alert[] {
  if (!column) {
    // Default sort: by severity (highest first), then by date (newest first)
    return [...alerts].sort((a, b) => {
      if (b.severity !== a.severity) {
        return b.severity - a.severity;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  const sorted = [...alerts].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (column) {
      case "customer":
        aValue = (a.customerBusinessName || "").toLowerCase();
        bValue = (b.customerBusinessName || "").toLowerCase();
        break;
      case "title":
        aValue = (a.title || "").toLowerCase();
        bValue = (b.title || "").toLowerCase();
        break;
      case "description":
        aValue = (a.description || "").toLowerCase();
        bValue = (b.description || "").toLowerCase();
        break;
      case "date":
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      default:
        return 0;
    }

    // Compare values
    let comparison = 0;
    if (typeof aValue === "string" && typeof bValue === "string") {
      comparison = aValue.localeCompare(bValue);
    } else if (typeof aValue === "number" && typeof bValue === "number") {
      comparison = aValue - bValue;
    }

    return direction === "asc" ? comparison : -comparison;
  });

  return sorted;
}

