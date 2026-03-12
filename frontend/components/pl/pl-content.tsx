"use client";

import { useEffect, useRef } from "react";
import { useChartAnimation } from "@/hooks/use-chart-animations";
import {
  generateCustomerPLData,
  generateCustomerTransactions,
  calculateAverageMonthlyCashFlow,
  calculateCashFlowVolatility,
} from "@/lib/customer-data";
import { formatMonthDisplay } from "@/lib/utils/date-helpers";
import monthLabels from "@/lib/data/pl-month-labels.json";
import distributions from "@/lib/data/pl-distributions.json";
import kpiConfig from "@/lib/data/pl-kpi-config.json";
import { PLKpiCards } from "./pl-kpi-cards";
import { PLRevenueExpensesChart } from "./pl-revenue-expenses-chart";
import { PLMarginChart } from "./pl-margin-chart";
import { PLCashFlowTable } from "./pl-cash-flow-table";

interface ConnectedServices {
  bank: boolean;
  erp: boolean;
  ecommerce?: boolean;
  bankName?: string;
  erpName?: string;
  ecommerceName?: string;
}

interface PLContentProps {
  customerSlug?: string;
  connectedServices?: ConnectedServices;
}

export function PLContent({
  customerSlug = "euromed-supplies-gmbh",
  connectedServices,
}: PLContentProps) {
  const {
    containerRef,
    animateOnMount,
    animateBars,
    animateDonut,
    animateGauge,
    addHoverEffects,
  } = useChartAnimation();

  // Generate customer-specific P&L data based on annual turnover
  const plData = generateCustomerPLData(customerSlug);
  const totalRevenue = plData.totalRevenue;
  const totalExpenses = plData.totalExpenses;

  // Generate transactions and calculate cash flow metrics
  const transactions = generateCustomerTransactions(customerSlug, 12);
  const averageMonthlyCashFlow = calculateAverageMonthlyCashFlow(transactions);
  const cashFlowVolatility = calculateCashFlowVolatility(transactions);

  // Build KPIs from config
  const kpis = kpiConfig.kpis.map((kpiConfig, index) => {
    let value: number;
    if (index === 0) value = totalRevenue;
    else if (index === 1) value = totalExpenses;
    else if (index === 2) value = averageMonthlyCashFlow;
    else value = parseFloat(cashFlowVolatility.toFixed(2));

    return {
      ...kpiConfig,
      value,
    };
  });

  // Calculate monthly distributions to match annual totals
  const revenueSum = distributions.revenue.reduce((sum, val) => sum + val, 0);
  const expenseSum = distributions.expenses.reduce((sum, val) => sum + val, 0);
  const revenueScale = totalRevenue / (revenueSum * 1000);
  const expenseScale = totalExpenses / (expenseSum * 1000);

  // Generate month data
  const monthData = monthLabels.months.map((month, i) => {
    const revenue = Math.round(distributions.revenue[i] * 1000 * revenueScale);
    const expenses = Math.round(distributions.expenses[i] * 1000 * expenseScale);
    return {
      month,
      revenue,
      expenses,
      income: revenue - expenses,
      margin: revenue ? ((revenue - expenses) / revenue) * 100 : 0,
    };
  });

  // Calculate monthly cash flow data from transactions
  const validTransactions = transactions.filter(
    (t) => t.category !== "transfer" && t.category !== "cancelled"
  );

  // Group transactions by month and calculate cash flow metrics
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
    const monthKey = transaction.date.substring(0, 7); // YYYY-MM
    if (!monthlyCashFlowData[monthKey]) {
      const monthDisplay = formatMonthDisplay(monthKey);
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

  // Calculate net flow for each month
  Object.keys(monthlyCashFlowData).forEach((monthKey) => {
    const data = monthlyCashFlowData[monthKey];
    data.netFlow = data.inflow - data.outflow;
  });

  // Convert to array and sort by month key (chronologically)
  const monthlyCashFlowArray = Object.values(monthlyCashFlowData).sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey)
  );

  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (hasAnimatedRef.current) return;
    animateOnMount(".pl-kpi-card", { delay: 0.05 });
    animateOnMount(".pl-chart-card", { delay: 0.1 });
    animateOnMount(".pl-detailed-card", { delay: 0.15 });
    animateOnMount(".pl-expense-chart-card", { delay: 0.2 });
    animateOnMount(".pl-pl-row", { delay: 0.3, stagger: 0.03 });
    setTimeout(() => {
      animateBars(".pl-revenue-bar", 0.2);
      animateBars(".pl-expenses-bar", 0.35);
      animateDonut(".pl-margin-donut", 0.4);
      animateGauge(".pl-margin-gauge", 0.5);
    }, 300);
    addHoverEffects(".pl-kpi-card", 1.02);
    hasAnimatedRef.current = true;
  }, [
    animateOnMount,
    animateBars,
    animateDonut,
    animateGauge,
    addHoverEffects,
  ]);

  return (
    <div ref={containerRef} className="flex flex-col gap-6">
      <PLKpiCards kpis={kpis} connectedServices={connectedServices} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PLRevenueExpensesChart
          monthData={monthData}
          connectedServices={connectedServices}
        />
        <PLMarginChart monthData={monthData} connectedServices={connectedServices} />
      </div>

      <PLCashFlowTable
        monthlyCashFlowArray={monthlyCashFlowArray}
        connectedServices={connectedServices}
      />
    </div>
  );
}

