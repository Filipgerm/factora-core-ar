/**
 * Number formatting utilities
 */

/**
 * Format a number with specified decimal places
 */
export function formatNumber(
  value: number,
  decimals: number = 2
): string {
  return value.toFixed(decimals);
}

/**
 * Format a percentage value
 */
export function formatPercentage(
  value: number,
  decimals: number = 2
): string {
  return `${value.toFixed(decimals)}%`;
}

