/**
 * Date and month formatting helpers
 */

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Get month names array
 */
export function getMonthNames(): string[] {
  return [...MONTH_NAMES];
}

/**
 * Convert YYYY-MM format to "Sep 2024" display format
 */
export function formatMonthDisplay(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const monthIndex = parseInt(month, 10) - 1;
  return `${MONTH_NAMES[monthIndex]} ${year}`;
}

/**
 * Format a date string to "Jan 1, 2025" format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return `${
    MONTH_NAMES[date.getMonth()]
  } ${date.getDate()}, ${date.getFullYear()}`;
}

