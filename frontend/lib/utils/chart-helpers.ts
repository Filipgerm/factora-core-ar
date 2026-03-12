/**
 * Chart utility functions for scaling, rounding, and path generation
 */

/**
 * Round a value to a "nice" number for chart display
 * Rounds to nearest multiple of magnitude/2 (e.g., 5k, 10k, 15k, 20k)
 */
export function roundToNice(value: number): number {
  if (value === 0) return 0;
  // Determine magnitude
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  // Round to nearest multiple of magnitude/2 (e.g., 5k, 10k, 15k, 20k)
  const rounded = Math.ceil(value / (magnitude / 2)) * (magnitude / 2);
  return rounded;
}

/**
 * Round margin values to whole percentages
 */
export function roundMarginToNice(value: number): number {
  return Math.ceil(value);
}

/**
 * Calculate scale function for chart values
 */
export function calculateValueScale(
  value: number,
  maxValue: number,
  plotHeight: number,
  paddingBottom: number
): number {
  const scaled = (value / maxValue) * plotHeight;
  return 100 - paddingBottom - scaled; // Invert Y (SVG coordinates)
}

/**
 * Generate SVG path string from data points
 */
export function generatePath(
  data: Array<{ x: number; y: number }>
): string {
  return data
    .map((point, i) => (i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
    .join(" ");
}

/**
 * Calculate Y-axis tick values with rounding
 */
export function calculateTickValues(
  maxValue: number,
  numTicks: number
): number[] {
  const tickValues: number[] = [];
  for (let i = 0; i <= numTicks; i++) {
    tickValues.push((maxValue / numTicks) * (numTicks - i));
  }
  return tickValues;
}

/**
 * Calculate chart dimensions and spacing
 */
export interface ChartDimensions {
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  plotHeight: number;
  plotWidth: number;
  pointSpacing: number;
}

export function calculateChartDimensions(
  dataPoints: number,
  paddingTop: number = 5,
  paddingBottom: number = 20,
  paddingLeft: number = 12,
  paddingRight: number = 10
): ChartDimensions {
  const plotHeight = 100 - paddingTop - paddingBottom;
  const plotWidth = 100 - paddingLeft - paddingRight;
  const pointSpacing = plotWidth / (dataPoints - 1);

  return {
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    plotHeight,
    plotWidth,
    pointSpacing,
  };
}

