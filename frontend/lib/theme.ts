/**
 * Brand theme colors - keep in sync with styles/globals.css :root
 *
 * PURPOSE: This file provides hex values for contexts that cannot use CSS variables:
 *   - Email templates (e.g. send-email API): HTML is sent as a string with inline styles
 *   - SVG charts (pl-revenue-expenses-chart, pl-margin-chart): stroke/fill need hex values
 *   - Any server-rendered or non-DOM output that needs brand colors
 *
 * React components use Tailwind classes (bg-brand-primary, etc.) which read from globals.css.
 * When changing the 3 lines in globals.css (--brand-primary, --brand-grad-start, --brand-grad-end),
 * update these values here for consistency.
 */
export const BRAND_PRIMARY = "#003380";
export const BRAND_GRAD_START = "#001a4d";
export const BRAND_GRAD_END = "#003380";
