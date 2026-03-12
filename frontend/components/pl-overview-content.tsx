"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sensitive } from "@/components/ui/sensitive";
import { usePrivacy } from "@/components/privacy-provider";
import { useChartAnimation, useChartHover } from "@/hooks/use-chart-animations";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { VisibleWhen } from "@/components/visible-when";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  generateCustomerPLData,
  generateCustomerTransactions,
  generateIncomeExpensesData,
  generateARAPData,
  generateReceivablesPaymentDistribution,
  generatePayablesPaymentDistribution,
  generateCustomerARAPData,
} from "@/lib/customer-data";
import { DualMetricCard } from "@/components/dual-metric-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

interface ConnectedServices {
  bank: boolean;
  erp: boolean;
  ecommerce?: boolean;
  bankName?: string;
  erpName?: string;
  ecommerceName?: string;
}

interface PLOverviewContentProps {
  customerSlug?: string;
  connectedServices?: ConnectedServices;
}

export function PLOverviewContent({
  customerSlug = "euromed-supplies-gmbh",
  connectedServices,
}: PLOverviewContentProps) {
  const {
    containerRef,
    animateOnMount,
    animateBars,
    animateDonut,
    animateGauge,
    addHoverEffects,
    addLegendHoverEffects,
  } = useChartAnimation();
  const { createTooltip, removeTooltip } = useChartHover();
  const { isDiscreet } = usePrivacy();
  const [paymentTab, setPaymentTab] = useState<"receivables" | "payables">(
    "receivables"
  );

  // Generate data for KPIs (from IncomeExpensesCards)
  const incomeExpensesData = generateIncomeExpensesData(customerSlug);
  const arapData = generateARAPData(customerSlug);
  const receivablesDistribution =
    generateReceivablesPaymentDistribution(customerSlug);
  const payablesDistribution =
    generatePayablesPaymentDistribution(customerSlug);

  // Generate data for charts and monthly cash flow (from PLContent)
  const plData = generateCustomerPLData(customerSlug);
  const totalRevenue = plData.totalRevenue;
  const totalExpenses = plData.totalExpenses;
  const transactions = generateCustomerTransactions(customerSlug, 12);

  // Generate AR/AP chart data
  const arapChartData = customerSlug
    ? generateCustomerARAPData(customerSlug)
    : [
        {
          month: "Feb",
          ar: 49834,
          ap: 41473,
        },
        {
          month: "Mar",
          ar: 44851,
          ap: 33179,
        },
        {
          month: "Apr",
          ar: 87209,
          ap: 49768,
        },
        {
          month: "May",
          ar: 89701,
          ap: 44238,
        },
        {
          month: "Jun",
          ar: 84718,
          ap: 47003,
        },
        {
          month: "Jul",
          ar: 79734,
          ap: 41473,
        },
        {
          month: "Aug",
          ar: 74751,
          ap: 27649,
        },
        {
          month: "Sep",
          ar: 69767,
          ap: 33179,
        },
        {
          month: "Oct",
          ar: 64784,
          ap: 49767,
        },
      ];

  const maxARAPValue =
    Math.max(...arapChartData.map((d) => Math.max(d.ar, d.ap))) * 1.1 || 1;

  // Monthly data for charts
  const monthsDetailed = [
    "Jan 2025",
    "Feb 2025",
    "Mar 2025",
    "Apr 2025",
    "May 2025",
    "Jun 2025",
    "Jul 2025",
    "Aug 2025",
    "Sep 2025",
    "Oct 2025",
    "Nov 2025",
    "Dec 2025",
  ];  

  // Get the actual annual turnover and gross margin from income expenses data
  const annualTurnover = incomeExpensesData.revenue;
  const targetGrossMargin = incomeExpensesData.grossMargin;
  
  // Revenue distribution pattern (relative weights for each month)
  const revenueDistK = [80, 81, 81, 82, 82, 84, 84, 84, 85, 85, 86, 86];
  const revenueSum = revenueDistK.reduce((sum, val) => sum + val, 0);
  
  // Scale revenue distribution to sum exactly to Annual Turnover
  const revenueScale = annualTurnover / (revenueSum * 1000);
  
  // Generate monthly margin values that average to the target gross margin
  // Range: targetGrossMargin ± 5% (38.02% to 48.02% for 43.02% target)
  // Create a trend pattern that varies but averages to the target
  const marginVariationPattern = [
    -3.5, -2.8, -4, -0.4, 0.6, 0.6, 3.2, 3, 4, 2.2, -0.6, -2.3
  ]; // These sum to approximately 0, ensuring average stays at target
  
  const monthData = monthsDetailed.map((m, i) => {
    // Calculate monthly revenue that sums to Annual Turnover
    const revenue = Math.round(revenueDistK[i] * 1000 * revenueScale);
    
    // Calculate dynamic margin that aligns with target gross margin
    // Add variation pattern and ensure it stays within ±5% range
    const marginVariation = marginVariationPattern[i] || 0;
    const dynamicMargin = Math.max(
      targetGrossMargin - 5,
      Math.min(
        targetGrossMargin + 5,
        targetGrossMargin + marginVariation
      )
    );
    
    // Calculate expenses to achieve the exact dynamic margin for this month
    // margin = (revenue - expenses) / revenue * 100
    // expenses = revenue * (1 - margin/100)
    const expenses = Math.round(revenue * (1 - dynamicMargin / 100));
    
    return {
      month: m,
      revenue,
      expenses,
      income: revenue - expenses,
      margin: parseFloat(dynamicMargin.toFixed(2)),
    };
  });

  // Calculate monthly cash flow data
  const validTransactions = transactions.filter(
    (t) => t.category !== "transfer" && t.category !== "cancelled"
  );

  const monthlyCashFlowData: Record<
    string,
    {
      monthKey: string;
      monthDisplay: string;
      inflow: number;
      outflow: number;
      netFlow: number;
    }
  > = {};

  validTransactions.forEach((transaction) => {
    const monthKey = transaction.date.substring(0, 7);
    if (!monthlyCashFlowData[monthKey]) {
      const date = new Date(transaction.date);
      const monthNames = [
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
      const monthDisplay = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

      monthlyCashFlowData[monthKey] = {
        monthKey,
        monthDisplay,
        inflow: 0,
        outflow: 0,
        netFlow: 0,
      };
    }

    if (transaction.amountEur > 0) {
      monthlyCashFlowData[monthKey].inflow += transaction.amountEur;
    } else {
      monthlyCashFlowData[monthKey].outflow += Math.abs(transaction.amountEur);
    }
  });

  Object.keys(monthlyCashFlowData).forEach((monthKey) => {
    const data = monthlyCashFlowData[monthKey];
    data.netFlow = data.inflow - data.outflow;
  });

  const monthlyCashFlowArray = Object.values(monthlyCashFlowData).sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey)
  );

  // Format helpers
  const formatCurrency = (value: number): string => {
    return `€${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatPercentage = (value: number, decimals: number = 2): string => {
    return `${value.toFixed(decimals)}%`;
  };

  const formatDays = (value: number): string => {
    return `${Math.floor(value)} Days`;
  };

  const formatNumber = (value: number): string => {
    return value.toLocaleString();
  };

  const formatCurrencyValue = (value: number): string => {
    return `€${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // KPI cards data
  const kpiCards = [
    {
      title: "Annual Turnover",
      value: formatCurrency(incomeExpensesData.revenue),
      // change: `${Math.abs(incomeExpensesData.revenueChange)}% ${
      //   incomeExpensesData.revenueChange >= 0 ? "increase" : "decrease"
      // } from last year`,
      // trend: incomeExpensesData.revenueTrend,
      // subtitle: "Total sales in the selected period",
      description: "Revenue = SUM(sales)",
      requires: ["erp"] as const,
    },
    {
      title: "Gross Margin",
      value: formatPercentage(incomeExpensesData.grossMargin),
      description:
        "Percentage of revenue remaining after subtracting the cost of goods sold",
      formula: "Gross Margin = ((Revenue − COGS) / Revenue) × 100",
      requires: ["erp"] as const,
    },
    {
      title: "EBITDA",
      value: formatCurrency(incomeExpensesData.ebitda),
      // subtitle: `EBITDA Margin ${formatPercentage(incomeExpensesData.ebitdaMargin)}`,
      description:
        "Earnings before interest, taxes, depreciation, and amortization",
      formula: "EBITDA = Revenue − COGS − Operating Expenses",
      requires: ["erp"] as const,
    },
    {
      title: "Net Income",
      value: formatCurrency(incomeExpensesData.netIncome),
      // subtitle: `Net Margin ${formatPercentage(incomeExpensesData.netMargin)}`,
      description: "Bottom line after all expenses",
      formula:
        "Net Income = Revenue − COGS − Opex − Interest − Taxes ± Other",
      requires: ["erp"] as const,
    },
  ];

  // AR metrics
  const arMetrics = [
    {
      left: {
        title: "Outstanding AR",
        value: formatCurrency(arapData.outstandingAR),
        trend: arapData.arTrend,
        description: "Unpaid customer invoices at period end",
        formula:
          "AR_open = Σ(invoice_amount − payments_applied − credit_notes) WHERE status=open",
      },
      right: {
        title: "DSO",
        value: formatDays(arapData.dso),
        trend: "up" as const,
        description: "Avg days to collect from customers",
        formula: "DSO = (Average_AR / Credit_Sales) * Days_in_Period",
      },
    },
    {
      left: {
        title: "Default Rate",
        value: formatPercentage(arapData.arDefaultRate, 2),
        trend: arapData.arDefaultRateTrend,
        description: "Percentage of AR with payment defaults",
      },
    },
  ];

  // AP metrics
  const apMetrics = [
    {
      left: {
        title: "Outstanding AP",
        value: formatCurrency(arapData.outstandingAP),
        trend: arapData.apTrend,
        description: "Unpaid supplier bills at period end",
        formula:
          "AP_open = Σ(bill_amount − payments_made − credit_notes) WHERE status=open",
      },
      right: {
        title: "DPO",
        value: formatDays(arapData.dpo),
        trend: arapData.dpoTrend,
        description: "Avg days to pay suppliers",
        formula: "DPO = (Average_AP / Purchases) * Days_in_Period",
      },
    },
    {
      left: {
        title: "Default Rate",
        value: formatPercentage(arapData.apDefaultRate, 2),
        trend: arapData.apDefaultRateTrend,
        description: "Percentage of AP with payment defaults",
      },
    },
  ];

  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (hasAnimatedRef.current) return;
    animateOnMount(".financial-kpi-card", { delay: 0.05 });
    animateOnMount(".financial-chart-card", { delay: 0.1 });
    animateOnMount(".financial-detailed-card", { delay: 0.15 });
    animateOnMount(".dual-metric-card", { delay: 0.2 });
    animateOnMount(".financial-pl-row", { delay: 0.3, stagger: 0.03 });
    setTimeout(() => {
      animateBars(".financial-revenue-bar", 0.2);
      animateBars(".financial-expenses-bar", 0.35);
      animateBars(".financial-ar-bar", 0.4);
      animateBars(".financial-ap-bar", 0.5);
      animateGauge(".financial-margin-gauge", 0.5);
    }, 300);
    addHoverEffects(".financial-kpi-card", 1.02);
    addHoverEffects(".dual-metric-card", 1.02);
    setTimeout(() => {
      addLegendHoverEffects();
    }, 1000);
    hasAnimatedRef.current = true;
  }, [
    animateOnMount,
    animateBars,
    animateDonut,
    animateGauge,
    addHoverEffects,
    addLegendHoverEffects,
  ]);

  const handleHover = (
    content: string,
    event: React.MouseEvent<HTMLElement, MouseEvent>
  ) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    createTooltip(content, rect.left + rect.width / 2, rect.top);
  };

  const handleCardHover = (
    title: string,
    value: string,
    subtitle?: string,
    description?: string,
    event?: React.MouseEvent
  ) => {
    if (!event) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const tooltipContent = isDiscreet
      ? `<div><strong>${title}</strong><br/>Hidden</div>`
      : `
      <div>
        <strong>${title}</strong><br/>
        Value: ${value}<br/>
        ${subtitle ? `${subtitle}<br/>` : ""}
        ${description ? description : ""}
      </div>
    `;
    createTooltip(tooltipContent, rect.left + rect.width / 2, rect.top);
  };

  const handleBarHover = (
    data: any,
    type: string,
    event: React.MouseEvent
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const value = type === "ar" ? data.ar : data.ap;
    const tooltipContent = isDiscreet
      ? `<div><strong>${data.month} ${
          type === "ar" ? "AR" : "AP"
        }</strong><br/>Hidden</div>`
      : `
      <div>
        <strong>${data.month} ${type === "ar" ? "AR" : "AP"}</strong><br/>
        €${(value / 1000).toFixed(0)}k
      </div>
    `;
    createTooltip(tooltipContent, rect.left + rect.width / 2, rect.top);
  };

  const renderKPICard = (
    card: {
      title: string;
      value: string;
      change?: string;
      trend?: "up" | "down";
      subtitle?: string;
      description?: string;
      formula?: string;
      requires: readonly ("erp" | "bank")[];
    },
    index: number
  ) => (
    <Card
      key={index}
      className="financial-kpi-card relative overflow-hidden cursor-pointer transition-shadow hover:shadow-lg"
      // HOVER FUNCTIONALITY IS DISABLED FOR NOW   
      // onMouseEnter={(e) =>
      //   handleCardHover(
      //     card.title,
      //     card.value,
      //     card.subtitle || card.description,
      //     card.formula,
      //     e
      //   )
      // }
      onMouseLeave={removeTooltip}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            {card.title}
          </h3>
          <Badge variant="secondary" className="text-xs">
            <VisibleWhen
              requires={card.requires}
              placeholder="—"
              connectedServices={connectedServices}
            >
              2025
            </VisibleWhen>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <VisibleWhen
              requires={card.requires}
              placeholder="—"
              connectedServices={connectedServices}
            >
              <Sensitive
                as="span"
                className="text-2xl font-bold text-foreground"
              >
                {card.value}
              </Sensitive>
            </VisibleWhen>
          </div>

          {card.subtitle && (
            <VisibleWhen
              requires={card.requires}
              connectedServices={connectedServices}
            >
              <Sensitive as="p" className="text-xs text-muted-foreground">
                {card.subtitle}
              </Sensitive>
            </VisibleWhen>
          )}

          {card.change && (
            <VisibleWhen
              requires={card.requires}
              connectedServices={connectedServices}
            >
              <div className="trend-indicator flex items-center gap-1">
                {card.trend === "up" ? (
                  <TrendingUp className="h-3 w-3 text-accent" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <Sensitive
                  className={`text-xs ${
                    card.trend === "up" ? "text-accent" : "text-destructive"
                  }`}
                >
                  {card.change}
                </Sensitive>
              </div>
            </VisibleWhen>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div ref={containerRef} className="flex flex-col gap-6">
      {/* Step 1: 4 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, index) => renderKPICard(card, index))}
      </div>

      {/* Step 2: Charts - Revenue vs Total Expenses and Profit Margin Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Total Expenses - Side by Side Histograms */}
        <Card className="financial-chart-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Revenue vs Total Expenses Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VisibleWhen
              requires={["bank"]}
              connectedServices={connectedServices}
            >
              <div className="h-80">
                <div className="relative h-full">
                  {(() => {
                    const maxValue = Math.max(
                      1,
                      ...monthData.map((d) => Math.max(d.revenue, d.expenses))
                    );
                    const paddedMax = maxValue * 1.1;

                    const roundToNice = (value: number): number => {
                      if (value === 0) return 0;
                      const magnitude = Math.pow(
                        10,
                        Math.floor(Math.log10(value))
                      );
                      const rounded =
                        Math.ceil(value / (magnitude / 2)) * (magnitude / 2);
                      return rounded;
                    };

                    const roundedMax = roundToNice(paddedMax);
                    const paddingTop = 5;
                    const paddingBottom = 20;
                    const paddingLeft = 12;
                    const paddingRight = 8;
                    const plotHeight = 100 - paddingTop - paddingBottom;
                    const plotWidth = 100 - paddingLeft - paddingRight;
                    const dataPoints = monthData.length;
                    const pointSpacing = plotWidth / (dataPoints - 1);

                    const valueScale = (value: number) => {
                      const scaled = (value / roundedMax) * plotHeight;
                      return 100 - paddingBottom - scaled;
                    };

                    const revenuePath = monthData
                      .map((d, i) => {
                        const x = paddingLeft + i * pointSpacing;
                        const y = valueScale(d.revenue);
                        return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                      })
                      .join(" ");

                    const expensesPath = monthData
                      .map((d, i) => {
                        const x = paddingLeft + i * pointSpacing;
                        const y = valueScale(d.expenses);
                        return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                      })
                      .join(" ");

                    const valueTicks = 5;
                    const valueTickValues: number[] = [];
                    for (let i = 0; i <= valueTicks; i++) {
                      valueTickValues.push(
                        (roundedMax / valueTicks) * (valueTicks - i)
                      );
                    }

                    return (
                      <>
                        <svg
                          viewBox="0 0 100 100"
                          className="w-full h-full"
                          preserveAspectRatio="none"
                        >
                          {valueTickValues.map((tick, idx) => {
                            const y = valueScale(tick);
                            if (idx > 0 && idx < valueTickValues.length - 1) {
                              return (
                                <line
                                  key={`grid-${idx}`}
                                  x1={paddingLeft}
                                  y1={y}
                                  x2={100 - paddingRight}
                                  y2={y}
                                  stroke="#e5e7eb"
                                  strokeWidth="0.5"
                                  strokeDasharray="2,2"
                                />
                              );
                            }
                            return null;
                          })}

                          <path
                            d={revenuePath}
                            fill="none"
                            stroke="#2f9a8a"
                            strokeWidth="0.4"
                            className="financial-revenue-bar"
                            data-chart-element
                          />

                          <path
                            d={expensesPath}
                            fill="none"
                            stroke="#133b4f"
                            strokeWidth="0.4"
                            className="financial-expenses-bar"
                            data-chart-element
                          />

                          {monthData.map((d, i) => {
                            const x = paddingLeft + i * pointSpacing;
                            const revenueY = valueScale(d.revenue);
                            const expensesY = valueScale(d.expenses);
                            return (
                              <g key={`data-points-${i}`}>
                                <rect
                                  x={x - pointSpacing / 2}
                                  y={paddingTop}
                                  width={pointSpacing}
                                  height={plotHeight}
                                  fill="transparent"
                                  className="cursor-pointer"
                                  onMouseEnter={(e) => {
                                    const rect = (
                                      e.currentTarget
                                        .ownerSVGElement as SVGSVGElement
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
                                <circle
                                  cx={x}
                                  cy={revenueY}
                                  r="0.6"
                                  fill="#2f9a8a"
                                  className="cursor-pointer"
                                />
                                <circle
                                  cx={x}
                                  cy={expensesY}
                                  r="0.6"
                                  fill="#133b4f"
                                  className="cursor-pointer"
                                />
                              </g>
                            );
                          })}
                        </svg>

                        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between pt-[5%] pb-[20%] pl-2">
                          {valueTickValues.map((tick, idx) => (
                            <span
                              key={`value-tick-${idx}`}
                              className="text-xs text-muted-foreground font-medium"
                            >
                              {tick >= 1000
                                ? `€${(tick / 1000).toFixed(0)}k`
                                : `€${tick.toFixed(0)}`}
                            </span>
                          ))}
                        </div>

                        <div className="absolute bottom-0 left-0 right-0">
                          {monthData.map((d, i) => {
                            const x = paddingLeft + i * pointSpacing;
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

                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col gap-2 text-sm bg-white/80 p-3 rounded shadow mb-5">
                          <div
                            className="flex items-center gap-2"
                            data-legend-item
                          >
                            <svg
                              width="16"
                              height="3"
                              className="flex-shrink-0"
                            >
                              <line
                                x1="0"
                                y1="1.5"
                                x2="16"
                                y2="1.5"
                                stroke="#2f9a8a"
                                strokeWidth="2"
                              />
                            </svg>
                            <span>Revenue</span>
                          </div>
                          <div
                            className="flex items-center gap-2"
                            data-legend-item
                          >
                            <svg
                              width="16"
                              height="3"
                              className="flex-shrink-0"
                            >
                              <line
                                x1="0"
                                y1="1.5"
                                x2="16"
                                y2="1.5"
                                stroke="#133b4f"
                                strokeWidth="2"
                              />
                            </svg>
                            <span>Expenses</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </VisibleWhen>
          </CardContent>
        </Card>

        {/* Gross Margin Trend - Single Axis Line Chart */}
        <Card className="financial-chart-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                Gross Margin Trend
              </CardTitle>
              <Badge variant="secondary">2025</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <VisibleWhen
              requires={["bank"]}
              connectedServices={connectedServices}
            >
              <div className="h-80">
                <div className="relative h-full">
                  {(() => {
                    const maxMargin = Math.max(
                      0.1,
                      ...monthData.map((d) => d.margin)
                    );
                    const paddedMaxMargin = maxMargin * 1.1;

                    const paddingTop = 5;
                    const paddingBottom = 20;
                    const paddingLeft = 12;
                    const paddingRight = 8;
                    const plotHeight = 100 - paddingTop - paddingBottom;
                    const plotWidth = 100 - paddingLeft - paddingRight;
                    const dataPoints = monthData.length;
                    const pointSpacing = plotWidth / (dataPoints - 1);

                    const roundMarginToNice = (value: number): number => {
                      return Math.ceil(value);
                    };

                    const roundedMaxMargin = roundMarginToNice(paddedMaxMargin);

                    const marginScale = (value: number) => {
                      const scaled = (value / roundedMaxMargin) * plotHeight;
                      return 100 - paddingBottom - scaled;
                    };

                    const marginPath = monthData
                      .map((d, i) => {
                        const x = paddingLeft + i * pointSpacing;
                        const y = marginScale(d.margin);
                        return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                      })
                      .join(" ");

                    const marginTicks = 5;
                    const marginTickValues: number[] = [];
                    for (let i = 0; i <= marginTicks; i++) {
                      marginTickValues.push(
                        (roundedMaxMargin / marginTicks) * (marginTicks - i)
                      );
                    }

                    return (
                      <>
                        <svg
                          viewBox="0 0 100 100"
                          className="w-full h-full"
                          preserveAspectRatio="none"
                        >
                          {marginTickValues.map((tick, idx) => {
                            const y = marginScale(tick);
                            if (idx > 0 && idx < marginTickValues.length - 1) {
                              return (
                                <line
                                  key={`grid-${idx}`}
                                  x1={paddingLeft}
                                  y1={y}
                                  x2={100 - paddingRight}
                                  y2={y}
                                  stroke="#e5e7eb"
                                  strokeWidth="0.5"
                                  strokeDasharray="2,2"
                                />
                              );
                            }
                            return null;
                          })}

                          <path
                            d={marginPath}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="0.4"
                            strokeDasharray="2,1.5"
                            className="financial-margin-gauge"
                            data-chart-element
                          />

                          {monthData.map((d, i) => {
                            const x = paddingLeft + i * pointSpacing;
                            const marginY = marginScale(d.margin);
                            return (
                              <g key={`data-points-${i}`}>
                                <rect
                                  x={x - pointSpacing / 2}
                                  y={paddingTop}
                                  width={pointSpacing}
                                  height={plotHeight}
                                  fill="transparent"
                                  className="cursor-pointer"
                                  onMouseEnter={(e) => {
                                    const rect = (
                                      e.currentTarget
                                        .ownerSVGElement as SVGSVGElement
                                    )?.getBoundingClientRect();
                                    if (rect && !isDiscreet) {
                                      handleHover(
                                        `<div><strong>${d.month.slice(
                                          0,
                                          3
                                        )}</strong><br/>Gross Margin: ${d.margin.toFixed(2)}%</div>`,
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
                                <circle
                                  cx={x}
                                  cy={marginY}
                                  r="0.6"
                                  fill="#f59e0b"
                                  className="cursor-pointer"
                                />
                              </g>
                            );
                          })}
                        </svg>

                        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between pt-[5%] pb-[20%] pl-2">
                          {marginTickValues.map((tick, idx) => (
                            <span
                              key={`margin-tick-${idx}`}
                              className="text-xs text-[#f59e0b] font-medium"
                            >
                              {Math.round(tick)}%
                            </span>
                          ))}
                        </div>

                        <div className="absolute bottom-0 left-0 right-0">
                          {monthData.map((d, i) => {
                            const x = paddingLeft + i * pointSpacing;
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

                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col gap-2 text-sm bg-white/80 p-3 rounded shadow mb-5">
                          <div
                            className="flex items-center gap-2"
                            data-legend-item
                          >
                            <svg
                              width="16"
                              height="3"
                              className="flex-shrink-0"
                            >
                              <line
                                x1="0"
                                y1="1.5"
                                x2="16"
                                y2="1.5"
                                stroke="#f59e0b"
                                strokeWidth="2"
                                strokeDasharray="4,3"
                              />
                            </svg>
                            <span>Gross Margin (%)</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </VisibleWhen>
          </CardContent>
        </Card>
      </div>

      {/* Step 3: AR and AP sections side by side, Payment Distribution, AR/AP Chart */}
      <div className="space-y-6">
        {/* AR and AP sections side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customers & Credits - AR */}
          <div className="space-y-4">
            <DualMetricCard
              cardTitle="Customers & Credits - AR"
              metrics={arMetrics}
              requires={["erp"]}
              className="dual-metric-card"
              connectedServices={connectedServices}
            />
          </div>

          {/* Suppliers & Obligations - AP */}
          <div className="space-y-4">
            <DualMetricCard
              cardTitle="Suppliers & Obligations - AP"
              metrics={apMetrics}
              requires={["erp"]}
              className="dual-metric-card"
              connectedServices={connectedServices}
            />
          </div>
        </div>

        {/* Payment Distribution Table */}
        {/* 
          STYLING OPTIONS FOR PAYMENT DISTRIBUTION TABLE BELOW:
          
          ✅ OPTION 1 (IMPLEMENTED): Row-level coloring
          - Value (Outstanding) row: Amber/Orange background (bg-amber-50/50)
          - Value (Total) row: Emerald/Green background (bg-emerald-50/50)

          OPTION 2: Professional data table styling (Best Practice)
          - Add subtle header gradient: CardHeader with bg-gradient-to-r from-slate-50 to-blue-50/30
          - Add alternating row colors for Number row: bg-slate-50/50
          - Add hover effects on all rows: hover:bg-slate-100/50
          - Add subtle shadow and border: shadow-md border border-slate-200
          - Use consistent color coding: Outstanding (warning/amber), Total (success/emerald)
          - This follows Material Design and Tailwind UI patterns for data tables
        */}
        <VisibleWhen requires={["erp"]} connectedServices={connectedServices}>
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Distribution of invoices net terms
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <Tabs
                  value={paymentTab}
                  onValueChange={(value) =>
                    setPaymentTab(value as "receivables" | "payables")
                  }
                  className="w-full"
                >
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-sm font-medium text-slate-600">
                      View:
                    </span>
                    <TabsList className="w-fit">
                      <TabsTrigger value="receivables">Receivables</TabsTrigger>
                      <TabsTrigger value="payables">Payables</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="receivables" className="mt-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="font-semibold"></TableHead>
                            <TableHead className="text-center font-semibold">
                              Total
                            </TableHead>
                            <TableHead className="text-center font-semibold">
                              0-30
                            </TableHead>
                            <TableHead className="text-center font-semibold">
                              31-60
                            </TableHead>
                            <TableHead className="text-center font-semibold">
                              61-90
                            </TableHead>
                            <TableHead className="text-center font-semibold">
                              91-120
                            </TableHead>
                            <TableHead className="text-center font-semibold">
                              &gt;= 121
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Number</TableCell>
                            <TableCell className="text-center">
                              <Sensitive>
                                {formatNumber(
                                  receivablesDistribution.total.count
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center">
                              <Sensitive>
                                {formatNumber(
                                  receivablesDistribution.days1to30.count
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center">
                              <Sensitive>
                                {formatNumber(
                                  receivablesDistribution.days31to60.count
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center">
                              <Sensitive>
                                {formatNumber(
                                  receivablesDistribution.days61to90.count
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center">
                              <Sensitive>
                                {formatNumber(
                                  receivablesDistribution.days91to120.count
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center">
                              <Sensitive>
                                {formatNumber(
                                  receivablesDistribution.days121Plus.count
                                )}
                              </Sensitive>
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-amber-50/50 hover:bg-amber-50 transition-colors">
                            <TableCell className="font-medium bg-amber-100/50">
                              Value (Outstanding)
                            </TableCell>
                            <TableCell className="text-center bg-amber-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  receivablesDistribution.total.outstanding
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center bg-amber-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  receivablesDistribution.days1to30.outstanding
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center bg-amber-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  receivablesDistribution.days31to60.outstanding
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center bg-amber-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  receivablesDistribution.days61to90.outstanding
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center bg-amber-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  receivablesDistribution.days91to120.outstanding
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center bg-amber-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  receivablesDistribution.days121Plus.outstanding
                                )}
                              </Sensitive>
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-emerald-50/50 hover:bg-emerald-50 transition-colors">
                            <TableCell className="font-medium bg-emerald-100/50">
                              Value (Total)
                            </TableCell>
                            <TableCell className="text-center bg-emerald-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  receivablesDistribution.total.total
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center bg-emerald-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  receivablesDistribution.days1to30.total
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center bg-emerald-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  receivablesDistribution.days31to60.total
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center bg-emerald-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  receivablesDistribution.days61to90.total
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center bg-emerald-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  receivablesDistribution.days91to120.total
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center bg-emerald-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  receivablesDistribution.days121Plus.total
                                )}
                              </Sensitive>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                  <TabsContent value="payables" className="mt-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="font-semibold"></TableHead>
                            <TableHead className="text-center font-semibold">
                              Total
                            </TableHead>
                            <TableHead className="text-center font-semibold">
                              0-30
                            </TableHead>
                            <TableHead className="text-center font-semibold">
                              31-60
                            </TableHead>
                            <TableHead className="text-center font-semibold">
                              61-90
                            </TableHead>
                            <TableHead className="text-center font-semibold">
                              91-120
                            </TableHead>
                            <TableHead className="text-center font-semibold">
                              &gt;= 121
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Number</TableCell>
                            <TableCell className="text-center">
                              <Sensitive>
                                {formatNumber(payablesDistribution.total.count)}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center">
                              <Sensitive>
                                {formatNumber(
                                  payablesDistribution.days1to30.count
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center">
                              <Sensitive>
                                {formatNumber(
                                  payablesDistribution.days31to60.count
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center">
                              <Sensitive>
                                {formatNumber(
                                  payablesDistribution.days61to90.count
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center">
                              <Sensitive>
                                {formatNumber(
                                  payablesDistribution.days91to120.count
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center">
                              <Sensitive>
                                {formatNumber(
                                  payablesDistribution.days121Plus.count
                                )}
                              </Sensitive>
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-amber-50/50 hover:bg-amber-50 transition-colors">
                            <TableCell className="font-medium bg-amber-100/50">
                              Value (Outstanding)
                            </TableCell>
                            <TableCell className="text-center bg-amber-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  payablesDistribution.total.outstanding
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center bg-amber-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  payablesDistribution.days1to30.outstanding
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center bg-amber-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  payablesDistribution.days31to60.outstanding
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center bg-amber-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  payablesDistribution.days61to90.outstanding
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center bg-amber-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  payablesDistribution.days91to120.outstanding
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center bg-amber-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  payablesDistribution.days121Plus.outstanding
                                )}
                              </Sensitive>
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-emerald-50/50 hover:bg-emerald-50 transition-colors">
                            <TableCell className="font-medium bg-emerald-100/50">
                              Value (Total)
                            </TableCell>
                            <TableCell className="text-center bg-emerald-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  payablesDistribution.total.total
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center bg-emerald-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  payablesDistribution.days1to30.total
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center bg-emerald-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  payablesDistribution.days31to60.total
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center bg-emerald-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  payablesDistribution.days61to90.total
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center bg-emerald-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  payablesDistribution.days91to120.total
                                )}
                              </Sensitive>
                            </TableCell>
                            <TableCell className="text-center bg-emerald-50/30">
                              <Sensitive>
                                {formatCurrencyValue(
                                  payablesDistribution.days121Plus.total
                                )}
                              </Sensitive>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </VisibleWhen>

        {/* Account Receivables and Account Payables Chart
        <div className="flex justify-center">
          <Card className="chart-card w-full max-w-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Account Receivables and Account Payables
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto">
              <VisibleWhen
                requires={["erp"]}
                connectedServices={connectedServices}
              >
                <div className="h-80">
                  <div className="relative h-full">
                    <div className="flex items-end justify-between h-full gap-1 px-4">
                      {arapChartData.map((data, index) => (
                        <div
                          key={data.month}
                          className="flex flex-col items-center gap-2 flex-1"
                        >
                          <div className="flex gap-1 h-64 justify-center items-end w-full">
                            <div
                              className="financial-ar-bar bg-[#2f9a8a] rounded-t w-3 cursor-pointer"
                              data-chart-element={true}
                              style={
                                {
                                  "--final-height": `${
                                    (data.ar / maxARAPValue) * 100
                                  }%`,
                                  minHeight: "4px",
                                } as React.CSSProperties
                              }
                              title={
                                isDiscreet
                                  ? undefined
                                  : `AR: €${(data.ar / 1000).toFixed(0)}k`
                              }
                              onMouseEnter={(e) => handleBarHover(data, "ar", e)}
                              onMouseLeave={removeTooltip}
                            />
                            <div
                              className="financial-ap-bar bg-[#133b4f] rounded-t w-3 cursor-pointer"
                              data-chart-element={true}
                              style={
                                {
                                  "--final-height": `${
                                    (data.ap / maxARAPValue) * 100
                                  }%`,
                                  minHeight: "4px",
                                } as React.CSSProperties
                              }
                              title={
                                isDiscreet
                                  ? undefined
                                  : `AP: €${(data.ap / 1000).toFixed(0)}k`
                              }
                              onMouseEnter={(e) => handleBarHover(data, "ap", e)}
                              onMouseLeave={removeTooltip}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {data.month}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="absolute top-0 right-0 flex flex-col gap-2 text-sm bg-white/80 p-3 rounded shadow">
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        data-legend-item={true}
                      >
                        <div className="w-4 h-2 bg-[#2f9a8a] rounded"></div>
                        <span>AR</span>
                      </div>
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        data-legend-item={true}
                      >
                        <div className="w-4 h-2 bg-[#133b4f] rounded"></div>
                        <span>AP</span>
                      </div>
                    </div>
                  </div>
                </div>
              </VisibleWhen>
            </CardContent>
          </Card>
        </div> */}
      </div>

      {/* Step 4: Monthly Cash Flow */}
      <div className="financial-detailed-card bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Monthly Cash Flow
          </h2>
          <Button className="rounded-lg bg-gradient-to-r from-[#2f9a8a] to-[#133b4f] hover:from-[#2a8a7a] hover:to-[#0f2d3f] text-white text-sm px-4 py-2">
            📊 Export CSV
          </Button>
        </div>
        <VisibleWhen requires={["bank"]} connectedServices={connectedServices}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                    Month
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                    Cash Inflow
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                    Cash Outflow
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                    Net Cash Flow
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {monthlyCashFlowArray.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 sm:px-6 py-10 text-center text-gray-500 text-sm"
                      colSpan={4}
                    >
                      No data available
                    </td>
                  </tr>
                ) : (
                  monthlyCashFlowArray.map((d) => (
                    <tr
                      key={d.monthKey}
                      className="financial-pl-row hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                        {d.monthDisplay}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-emerald-600 text-sm">
                        <Sensitive>
                          €{d.inflow.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Sensitive>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-rose-600 text-sm">
                        <Sensitive>
                          €{d.outflow.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Sensitive>
                      </td>
                      <td
                        className={`px-4 sm:px-6 py-4 text-sm font-medium ${
                          d.netFlow >= 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        <Sensitive>
                          €{d.netFlow.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Sensitive>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </VisibleWhen>
      </div>
    </div>
  );
}

