"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisibleWhen } from "@/components/visible-when";
import { useChartHover } from "@/hooks/use-chart-animations";
import { usePrivacy } from "@/components/privacy-provider";
import {
  roundToNice,
  calculateChartDimensions,
  calculateTickValues,
  calculateValueScale,
  generatePath,
} from "@/lib/utils/chart-helpers";
import { formatCurrencyForChart } from "@/lib/utils/format-currency";
import chartConfig from "@/lib/data/pl-chart-config.json";
import { BRAND_PRIMARY, BRAND_GRAD_START } from "@/lib/theme";

const chartColors = { revenue: BRAND_PRIMARY, expenses: BRAND_GRAD_START };

interface ConnectedServices {
  bank: boolean;
  erp: boolean;
  ecommerce?: boolean;
  bankName?: string;
  erpName?: string;
  ecommerceName?: string;
}

interface MonthData {
  month: string;
  revenue: number;
  expenses: number;
  income: number;
  margin: number;
}

interface PLRevenueExpensesChartProps {
  monthData: MonthData[];
  connectedServices?: ConnectedServices;
}

export function PLRevenueExpensesChart({
  monthData,
  connectedServices,
}: PLRevenueExpensesChartProps) {
  const { createTooltip, removeTooltip } = useChartHover();
  const { isDiscreet } = usePrivacy();

  // Calculate max from both revenue and expenses
  const maxValue = Math.max(
    1,
    ...monthData.map((d) => Math.max(d.revenue, d.expenses))
  );

  // Add 10% padding
  const paddedMax = maxValue * 1.1;
  const roundedMax = roundToNice(paddedMax);

  // Chart dimensions
  const dimensions = calculateChartDimensions(
    monthData.length,
    chartConfig.padding.top,
    chartConfig.padding.bottom,
    chartConfig.padding.left,
    8 // paddingRight for this chart
  );

  // Scale function
  const valueScale = (value: number) => {
    return calculateValueScale(value, roundedMax, dimensions.plotHeight, dimensions.paddingBottom);
  };

  // Generate paths
  const revenuePath = generatePath(
    monthData.map((d, i) => ({
      x: dimensions.paddingLeft + i * dimensions.pointSpacing,
      y: valueScale(d.revenue),
    }))
  );

  const expensesPath = generatePath(
    monthData.map((d, i) => ({
      x: dimensions.paddingLeft + i * dimensions.pointSpacing,
      y: valueScale(d.expenses),
    }))
  );

  // Generate Y-axis tick values
  const valueTickValues = calculateTickValues(roundedMax, chartConfig.ticks.value);

  const handleHover = (
    content: string,
    event: React.MouseEvent<HTMLElement, MouseEvent>
  ) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    createTooltip(content, rect.left + rect.width / 2, rect.top);
  };

  return (
    <Card className="pl-chart-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Revenue vs Expenses Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <VisibleWhen requires={["bank"]} connectedServices={connectedServices}>
          <div className="h-80">
            <div className="relative h-full">
              {/* SVG Container */}
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full"
                preserveAspectRatio="none"
              >
                {/* Grid lines (subtle) */}
                {valueTickValues.map((tick, idx) => {
                  const y = valueScale(tick);
                  if (idx > 0 && idx < valueTickValues.length - 1) {
                    return (
                      <line
                        key={`grid-${idx}`}
                        x1={dimensions.paddingLeft}
                        y1={y}
                        x2={100 - dimensions.paddingRight}
                        y2={y}
                        stroke="#e5e7eb"
                        strokeWidth="0.5"
                        strokeDasharray="2,2"
                      />
                    );
                  }
                  return null;
                })}

                {/* Revenue Line */}
                <path
                  d={revenuePath}
                  fill="none"
                  stroke={chartColors.revenue}
                  strokeWidth="0.4"
                  className="pl-revenue-bar"
                  data-chart-element
                />

                {/* Expenses Line */}
                <path
                  d={expensesPath}
                  fill="none"
                  stroke={chartColors.expenses}
                  strokeWidth="0.4"
                  className="pl-expenses-bar"
                  data-chart-element
                />

                {/* Revenue and Expenses Data Points with hover areas */}
                {monthData.map((d, i) => {
                  const x = dimensions.paddingLeft + i * dimensions.pointSpacing;
                  const revenueY = valueScale(d.revenue);
                  const expensesY = valueScale(d.expenses);
                  return (
                    <g key={`data-points-${i}`}>
                      {/* Invisible hover area */}
                      <rect
                        x={x - dimensions.pointSpacing / 2}
                        y={dimensions.paddingTop}
                        width={dimensions.pointSpacing}
                        height={dimensions.plotHeight}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={(e) => {
                          const rect = (
                            e.currentTarget.ownerSVGElement as SVGSVGElement
                          )?.getBoundingClientRect();
                          if (rect && !isDiscreet) {
                            handleHover(
                              `<div><strong>${d.month.slice(
                                0,
                                3
                              )}</strong><br/>Revenue: €${d.revenue.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}<br/>Expenses: €${d.expenses.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}</div>`,
                              {
                                currentTarget: {
                                  getBoundingClientRect: () => rect,
                                } as HTMLElement,
                              } as React.MouseEvent<HTMLElement>
                            );
                          }
                        }}
                        onMouseLeave={removeTooltip}
                      />
                      {/* Revenue Data Point */}
                      <circle
                        cx={x}
                        cy={revenueY}
                        r="0.6"
                        fill={chartColors.revenue}
                        className="cursor-pointer"
                      />
                      {/* Expenses Data Point */}
                      <circle
                        cx={x}
                        cy={expensesY}
                        r="0.6"
                        fill={chartColors.expenses}
                        className="cursor-pointer"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Left Y-axis labels (Currency) */}
              <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between pt-[5%] pb-[20%] pl-2">
                {valueTickValues.map((tick, idx) => (
                  <span
                    key={`value-tick-${idx}`}
                    className="text-xs text-muted-foreground font-medium"
                  >
                    {formatCurrencyForChart(tick)}
                  </span>
                ))}
              </div>

              {/* X-axis labels (Months) */}
              <div className="absolute bottom-0 left-0 right-0">
                {monthData.map((d, i) => {
                  const x = dimensions.paddingLeft + i * dimensions.pointSpacing;
                  return (
                    <span
                      key={`month-${d.month}`}
                      className="text-xs text-muted-foreground absolute"
                      style={{
                        left: `${x}%`,
                        transform: "translateX(-50%)",
                      }}
                    >
                      {d.month.slice(0, 3)}
                    </span>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col gap-2 text-sm bg-white/80 p-3 rounded shadow mb-5">
                <div className="flex items-center gap-2" data-legend-item>
                  <svg width="16" height="3" className="flex-shrink-0">
                    <line
                      x1="0"
                      y1="1.5"
                      x2="16"
                      y2="1.5"
                      stroke={chartColors.revenue}
                      strokeWidth="2"
                    />
                  </svg>
                  <span>Revenue</span>
                </div>
                <div className="flex items-center gap-2" data-legend-item>
                  <svg width="16" height="3" className="flex-shrink-0">
                    <line
                      x1="0"
                      y1="1.5"
                      x2="16"
                      y2="1.5"
                      stroke={chartColors.expenses}
                      strokeWidth="2"
                    />
                  </svg>
                  <span>Expenses</span>
                </div>
              </div>
            </div>
          </div>
        </VisibleWhen>
      </CardContent>
    </Card>
  );
}

