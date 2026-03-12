/**
 * Dashboard configuration constants
 * Centralized configuration for dashboard pages
 */

// Default VAT number for buyer views
export const BUYER_VAT = "EL123456789";

/**
 * Background color usage guidelines:
 * - bg-white: Use for content-heavy pages (tables, forms, detailed views)
 * - bg-slate-50: Use for dashboard/overview pages with cards and metrics
 */
export const DASHBOARD_BACKGROUNDS = {
  CONTENT_HEAVY: "white" as const,
  OVERVIEW: "slate-50" as const,
} as const;

/**
 * Container max-width options
 */
export const DASHBOARD_MAX_WIDTHS = {
  STANDARD: "7xl" as const,
  NARROW: "4xl" as const,
} as const;

