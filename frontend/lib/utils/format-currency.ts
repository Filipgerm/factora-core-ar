/**
 * Centralized currency formatting utilities
 * Provides consistent currency formatting across the application
 */

export interface CurrencyFormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useAbbreviation?: boolean;
}

/**
 * Format a number as currency with consistent decimal handling
 */
export function formatCurrency(
  value: number,
  currency: string = "€",
  options: CurrencyFormatOptions = {}
): string {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    useAbbreviation = false,
  } = options;

  if (useAbbreviation) {
    if (value >= 1000000) {
      return `${currency}${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${currency}${Math.round(value / 1000)}k`;
    }
    return `${currency}${Math.round(value)}`;
  }

  return `${currency}${value.toLocaleString(undefined, {
    minimumFractionDigits,
    maximumFractionDigits,
  })}`;
}

/**
 * Format currency for display in charts (abbreviated format)
 */
export function formatCurrencyForChart(value: number, currency: string = "€"): string {
  if (value >= 1000) {
    return `${currency}${(value / 1000).toFixed(0)}k`;
  }
  return `${currency}${value.toFixed(0)}`;
}

