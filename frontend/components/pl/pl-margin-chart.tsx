"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VisibleWhen } from "@/components/visible-when";
import { useChartHover } from "@/hooks/use-chart-animations";
import { usePrivacy } from "@/components/privacy-provider";
import {
  roundToNice,
  roundMarginToNice,
  calculateChartDimensions,
  calculateTickValues,
  calculateValueScale,
  generatePath,
} from "@/lib/utils/chart-helpers";
import { formatCurrencyForChart } from "@/lib/utils/format-currency";
import chartConfig from "@/lib/data/pl-chart-config.json";
import { BRAND_PRIMARY } from "@/lib/theme";

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

interface PLMarginChartProps {
  monthData: MonthData[];
  connectedServices?: ConnectedServices;
}

export function PLMarginChart({
  monthData,
  connectedServices,
}: PLMarginChartProps) {
  const { createTooltip, removeTooltip } = useChartHover();
  const { isDiscreet } = usePrivacy();

  const maxRevenue = Math.max(1, ...monthData.map((d) => d.revenue));
  const maxMargin = Math.max(0.1, ...monthData.map((d) => d.margin));

  // Add 10% padding to max values
  const paddedMaxRevenue = maxRevenue * 1.1;
  const paddedMaxMargin = maxMargin * 1.1;

  // Round max values for cleaner axis labels and scaling
  const roundedMaxRevenue = roundToNice(paddedMaxRevenue);
  const roundedMaxMargin = roundMarginToNice(paddedMaxMargin);

  // Chart dimensions
  const dimensions = calculateChartDimensions(
    monthData.length,
    chartConfig.padding.top,
    chartConfig.padding.bottom,
    chartConfig.padding.left,
    chartConfig.padding.right
  );

  // Scale functions
  const revenueScale = (value: number) => {
    return calculateValueScale(
      value,
      roundedMaxRevenue,
      dimensions.plotHeight,
      dimensions.paddingBottom
    );
  };

  const marginScale = (value: number) => {
    return calculateValueScale(
      value,
      roundedMaxMargin,
      dimensions.plotHeight,
      dimensions.paddingBottom
    );
  };

  // Generate paths
  const revenuePath = generatePath(
    monthData.map((d, i) => ({
      x: dimensions.paddingLeft + i * dimensions.pointSpacing,
      y: revenueScale(d.revenue),
    }))
  );

  const marginPath = generatePath(
    monthData.map((d, i) => ({
      x: dimensions.paddingLeft + i * dimensions.pointSpacing,
      y: marginScale(d.margin),
    }))
  );

  // Generate Y-axis tick values
  const revenueTickValues = calculateTickValues(
    roundedMaxRevenue,
    chartConfig.ticks.revenue
  );
  const marginTickValues = calculateTickValues(
    roundedMaxMargin,
    chartConfig.ticks.margin
  );

  const handleHover = (
    content: string,
    event: React.MouseEvent<HTMLElement, MouseEvent>
  ) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    createTooltip(content, rect.left + rect.width / 2, rect.top);
  };

  return (
    <Card className="pl-chart-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Profit Margin Trend
          </CardTitle>
          <Badge variant="secondary">2025</Badge>
        </div>
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
                {revenueTickValues.map((tick, idx) => {
                  const y = revenueScale(tick);
                  if (idx > 0 && idx < revenueTickValues.length - 1) {
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
                  stroke={chartConfig.colors.revenue}
                  strokeWidth="0.4"
                  className="pl-revenue-bar"
                  data-chart-element
                />

                {/* Margin Line (dashed) */}
                <path
                  d={marginPath}
                  fill="none"
                  stroke={chartConfig.colors.margin}
                  strokeWidth="0.4"
                  strokeDasharray="2,1.5"
                  className="pl-margin-gauge"
                  data-chart-element
                />

                {/* Revenue and Margin Data Points with hover areas */}
                {monthData.map((d, i) => {
                  const x = dimensions.paddingLeft + i * dimensions.pointSpacing;
                  const revenueY = revenueScale(d.revenue);
                  const marginY = marginScale(d.margin);
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
                              })}<br/>Margin: ${d.margin.toFixed(2)}%</div>`,
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
                        fill={chartConfig.colors.revenue}
                        className="cursor-pointer"
                      />
                      {/* Margin Data Point */}
                      <circle
                        cx={x}
                        cy={marginY}
                        r="0.6"
                        fill={chartConfig.colors.margin}
                        className="cursor-pointer"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Left Y-axis labels (Revenue) */}
              <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between pt-[5%] pb-[20%] pl-2">
                {revenueTickValues.map((tick, idx) => (
                  <span
                    key={`revenue-tick-${idx}`}
                    className="text-xs text-brand-primary font-medium"
                  >
                    {formatCurrencyForChart(tick)}
                  </span>
                ))}
              </div>

              {/* Right Y-axis labels (Margin) */}
              <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between pt-[5%] pb-[20%] pr-2">
                {marginTickValues.map((tick, idx) => (
                  <span
                    key={`margin-tick-${idx}`}
                    className="text-xs text-[#f59e0b] font-medium"
                  >
                    {Math.round(tick)}%
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
                      stroke={chartConfig.colors.revenue}
                      strokeWidth="2"
                    />
                  </svg>
                  <span>Revenue (€)</span>
                </div>
                <div className="flex items-center gap-2" data-legend-item>
                  <svg width="16" height="3" className="flex-shrink-0">
                    <line
                      x1="0"
                      y1="1.5"
                      x2="16"
                      y2="1.5"
                      stroke={chartConfig.colors.margin}
                      strokeWidth="2"
                      strokeDasharray="4,3"
                    />
                  </svg>
                  <span>Margin (%)</span>
                </div>
              </div>
            </div>
          </div>
        </VisibleWhen>
      </CardContent>
    </Card>
  );
}

