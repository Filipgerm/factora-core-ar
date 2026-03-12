"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useChartHover } from "@/hooks/use-chart-animations";
import { Sensitive } from "@/components/ui/sensitive";
import { usePrivacy } from "@/components/privacy-provider";
import { VisibleWhen } from "@/components/visible-when";

interface Metric {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down";
  description?: string;
  formula?: string;
}

interface MetricRow {
  left: Metric;
  right?: Metric;
}

interface ConnectedServices {
  bank: boolean;
  erp: boolean;
  ecommerce?: boolean;
  bankName?: string;
  erpName?: string;
  ecommerceName?: string;
}

interface DualMetricCardProps {
  cardTitle: string;
  metrics: MetricRow[];
  requires: readonly ("erp" | "bank")[];
  className?: string;
  connectedServices?: ConnectedServices;
}

export function DualMetricCard({
  cardTitle,
  metrics,
  requires,
  className = "",
  connectedServices,
}: DualMetricCardProps) {
  const { createTooltip, removeTooltip } = useChartHover();
  const { isDiscreet } = usePrivacy();

  // HOVER FUNCTIONALITY IS DISABLED FOR NOW
  // const handleCardHover = (event: React.MouseEvent) => {
  //   const rect = event.currentTarget.getBoundingClientRect();
  //   if (isDiscreet) {
  //     createTooltip(
  //       `<div><strong>${cardTitle}</strong><br/>Hidden</div>`,
  //       rect.left + rect.width / 2,
  //       rect.top
  //     );
  //     return;
  //   }

  //   let tooltipContent = `<div><strong>${cardTitle}</strong><br/>`;
  //   metrics.forEach((row) => {
  //     tooltipContent += `<strong>${row.left.title}:</strong> ${row.left.value}<br/>`;
  //     if (row.left.description) {
  //       tooltipContent += `${row.left.description}<br/>`;
  //     }
  //     if (row.left.formula) {
  //       tooltipContent += `Formula: ${row.left.formula}<br/>`;
  //     }
  //     if (row.right) {
  //       tooltipContent += `<strong>${row.right.title}:</strong> ${row.right.value}<br/>`;
  //       if (row.right.description) {
  //         tooltipContent += `${row.right.description}<br/>`;
  //       }
  //       if (row.right.formula) {
  //         tooltipContent += `Formula: ${row.right.formula}<br/>`;
  //       }
  //     }
  //   });
  //   tooltipContent += `</div>`;
  //   createTooltip(tooltipContent, rect.left + rect.width / 2, rect.top);
  // };

  const renderMetric = (metric: Metric) => (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">
        {metric.title}
      </div>
      <VisibleWhen requires={requires} placeholder="—" connectedServices={connectedServices}>
        <Sensitive
          as="span"
          className="text-2xl font-bold text-foreground block"
        >
          {metric.value}
        </Sensitive>
      </VisibleWhen>
      {metric.change && (
        <VisibleWhen requires={requires} connectedServices={connectedServices}>
          <div className="trend-indicator flex items-center gap-1">
            {(() => {
              // DSO should always show red/destructive color even if trend is "up"
              const isDSO = metric.title === "DSO";
              if (isDSO) {
                // For DSO, show TrendingUp icon but with red/destructive color
                return <TrendingUp className="h-3 w-3 text-destructive" />;
              }
              // For other metrics, use normal trend logic
              return metric.trend === "up" ? (
                <TrendingUp className="h-3 w-3 text-accent" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              );
            })()}
            <Sensitive
              className={`text-xs ${(() => {
                // DSO should always show red/destructive color even if trend is "up"
                const isDSO = metric.title === "DSO";
                return isDSO || metric.trend !== "up"
                  ? "text-destructive"
                  : "text-accent";
              })()}`}
            >
              {metric.change}
            </Sensitive>
          </div>
        </VisibleWhen>
      )}
    </div>
  );

  return (
    <Card
      className={`${className} relative overflow-hidden cursor-pointer transition-shadow hover:shadow-lg`}
      // HOVER FUNCTIONALITY IS DISABLED FOR NOW
      // onMouseEnter={handleCardHover} 
      onMouseLeave={removeTooltip}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            {cardTitle}
          </h3>
          <Badge variant="secondary" className="text-xs">
            <VisibleWhen requires={requires} placeholder="—" connectedServices={connectedServices}>
              2025
            </VisibleWhen>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {metrics.map((row, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Left Metric */}
              <div>{renderMetric(row.left)}</div>
              {/* Right Metric */}
              <div>{row.right ? renderMetric(row.right) : null}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
