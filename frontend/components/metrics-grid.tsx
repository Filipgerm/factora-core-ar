"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, TrendingUp, TrendingDown } from "lucide-react";
import { generateCustomerMetrics } from "@/lib/customer-data";
import { useChartAnimation, useChartHover } from "@/hooks/use-chart-animations";
import { useEffect } from "react";
import { Sensitive } from "@/components/ui/sensitive";
import { usePrivacy } from "@/components/privacy-provider";
import { useConnectionGates } from "@/lib/integrations";
import { VisibleWhen } from "@/components/visible-when";

// Financial scaling factor for the Financial Overview tab
const FINANCIAL_SCALE_FACTOR = 0.1945;

interface ConnectedServices {
  bank: boolean;
  erp: boolean;
  ecommerce?: boolean;
  bankName?: string;
  erpName?: string;
  ecommerceName?: string;
}

interface MetricsGridProps {
  customerSlug?: string;
  connectedServices?: ConnectedServices;
}

export function MetricsGrid({ customerSlug, connectedServices }: MetricsGridProps) {
  const { containerRef, animateOnMount, addHoverEffects } = useChartAnimation();
  const { createTooltip, removeTooltip } = useChartHover();
  const { isDiscreet } = usePrivacy();
  const { hasERP, hasBank } = useConnectionGates();

  // Generate customer-specific metrics or use default values
  const customerMetrics = customerSlug
    ? generateCustomerMetrics(customerSlug)
    : null;

  // Always show full metrics; no gating by lists

  const metrics = [
    {
      title: "Annual Turnover",
      value:
        customerMetrics?.annualTurnover ||
        `€${(4748433 * FINANCIAL_SCALE_FACTOR).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      change: customerMetrics?.turnoverChange || "13% increase from last year",
      trend: customerMetrics?.turnoverTrend || "up",
      year: "2025",
      requires: [] as const,
    },
    {
      title: "Margin",
      value: customerMetrics?.margin || "18.50%",
      subtitle: `Target • ${customerMetrics?.marginTarget || "20.00%"}`,
      year: "2025",
      requires: [] as const,
    },
    {
      title: "EBITDA",
      value:
        customerMetrics?.ebitda ||
        `€${(635235 * FINANCIAL_SCALE_FACTOR).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      change: customerMetrics?.ebitdaChange || "7% increase from last year",
      trend: customerMetrics?.ebitdaTrend || "up",
      year: "2025",
      requires: [] as const,
    },
    {
      title: "Balance",
      value:
        customerMetrics?.balance ||
        `€${(1247832 * FINANCIAL_SCALE_FACTOR).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      change: customerMetrics?.balanceChange || "8% increase from last year",
      trend: customerMetrics?.balanceTrend || "up",
      year: "2025",
      requires: ["bank"] as const,
    },
    {
      title: "Credit Limit",
      // value: customerMetrics?.creditLimit || "€2,850,000.00",
      value: "€100,000.00",
      // change:
      //   customerMetrics?.creditLimitChange || "13% increase from last year",
      // trend: customerMetrics?.creditLimitTrend || "up",
      year: "2025",
      requires: ["erp"] as const,
    },
    {
      title: "Outstanding AR",
      value:
        customerMetrics?.outstandingAR ||
        `€${(274932.23 * FINANCIAL_SCALE_FACTOR).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      change:
        customerMetrics?.outstandingARChange || "13% increase from last year",
      trend: customerMetrics?.outstandingARTrend || "up",
      year: "2025",
      requires: ["erp"] as const,
    },
    {
      title: "DSO",
      value: customerMetrics?.dso || "38 Days",
      change: customerMetrics?.dsoChange || "24% Decrease from last year",
      trend: customerMetrics?.dsoTrend || "down",
      year: "2025",
      requires: ["erp"] as const,
    },
    {
      title: "Default Rate",
      value: customerMetrics?.defaultRate || "2.30%",
      change:
        customerMetrics?.defaultRateChange || "0.5% decrease from last year",
      trend: customerMetrics?.defaultRateTrend || "down",
      year: "2025",
      requires: ["erp"] as const,
    },
  ];

  useEffect(() => {
    // Animate cards on mount
    animateOnMount(".metric-card");

    // Add hover effects to cards
    addHoverEffects(".metric-card", 1.02);

    // Add hover effects to trend indicators
    addHoverEffects(".trend-indicator", 1.1);
  }, [animateOnMount, addHoverEffects]);

  const handleMetricHover = (metric: any, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const tooltipContent = isDiscreet
      ? `<div><strong>${metric.title}</strong><br/>Hidden</div>`
      : `
      <div>
        <strong>${metric.title}</strong><br/>
        Value: ${metric.value}<br/>
        ${metric.change ? `Change: ${metric.change}` : ""}
        ${metric.subtitle ? `<br/>${metric.subtitle}` : ""}
      </div>
    `;
    createTooltip(tooltipContent, rect.left + rect.width / 2, rect.top);
  };

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {metrics.map((metric, index) => (
        <Card
          key={index}
          className="metric-card relative overflow-hidden cursor-pointer transition-shadow hover:shadow-lg"
          onMouseEnter={(e) => handleMetricHover(metric, e)}
          onMouseLeave={removeTooltip}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </h3>
              <Badge variant="secondary" className="text-xs">
                <VisibleWhen requires={metric.requires} placeholder="—" connectedServices={connectedServices}>
                  {metric.year}
                </VisibleWhen>
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <VisibleWhen requires={metric.requires} placeholder="—" connectedServices={connectedServices}>
                  <Sensitive
                    as="span"
                    className="text-2xl font-bold text-foreground"
                  >
                    {metric.value}
                  </Sensitive>
                </VisibleWhen>
              </div>

              {metric.subtitle && (
                <VisibleWhen requires={metric.requires} connectedServices={connectedServices}>
                  <Sensitive as="p" className="text-xs text-muted-foreground">
                    {metric.subtitle}
                  </Sensitive>
                </VisibleWhen>
              )}

              {metric.change && (
                <VisibleWhen requires={metric.requires} connectedServices={connectedServices}>
                  <div className="trend-indicator flex items-center gap-1">
                    {metric.trend === "up" ? (
                      <TrendingUp className="h-3 w-3 text-accent" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
                    <Sensitive
                      className={`text-xs ${
                        metric.trend === "up"
                          ? "text-accent"
                          : "text-destructive"
                      }`}
                    >
                      {metric.change}
                    </Sensitive>
                  </div>
                </VisibleWhen>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
