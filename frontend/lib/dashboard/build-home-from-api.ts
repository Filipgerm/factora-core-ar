import type { DashboardMetricsResponse } from "@/lib/schemas/dashboard";
import type { SellerMetricsResponse } from "@/lib/schemas/dashboard";
import type {
  HomeActionItem,
  HomeKpiMetric,
  HomeKpiSparkPoint,
} from "@/lib/views/home";

function monthlyToSpark(rows: Record<string, unknown>[]): HomeKpiSparkPoint[] {
  return rows.map((row, i) => {
    const v =
      typeof row.value === "number"
        ? row.value
        : typeof row.revenue === "number"
          ? row.revenue
          : typeof row.total === "number"
            ? row.total
            : typeof row.amount === "number"
              ? row.amount
              : Number(row.net ?? row.sum ?? 0) || 0;
    return { i, v };
  });
}

function pickFormatForAmount(
  amount: number
): HomeKpiMetric["formatKey"] {
  if (Math.abs(amount) >= 1_000_000) return "eur_millions";
  return "eur_integer";
}

/**
 * Maps P&L dashboard metrics into home KPI cards. Labels are aligned with banking P&L, not legacy ARR copy.
 */
export function buildHomeKpiMetricsFromPlMetrics(
  m: DashboardMetricsResponse
): HomeKpiMetric[] {
  const revSpark = monthlyToSpark(m.monthly_revenue);
  const expSpark = monthlyToSpark(m.monthly_expenses);
  const niSpark = monthlyToSpark(m.monthly_net_income);
  const marginSpark = monthlyToSpark(m.monthly_margin);

  const revenueFmt = pickFormatForAmount(m.total_revenue);
  const revenueTarget =
    revenueFmt === "eur_millions" ? m.total_revenue / 1_000_000 : m.total_revenue;

  const niFmt = pickFormatForAmount(m.net_income);
  const niTarget =
    niFmt === "eur_millions" ? m.net_income / 1_000_000 : m.net_income;

  const changeFromSeries = (series: HomeKpiSparkPoint[]): number => {
    if (series.length < 2) return 0;
    const a = series[series.length - 2]?.v ?? 0;
    const b = series[series.length - 1]?.v ?? 0;
    if (a === 0) return 0;
    return ((b - a) / Math.abs(a)) * 100;
  };

  const primaryA: HomeKpiMetric = {
    id: "kpi-arr",
    title: "Total revenue",
    tier: "primary",
    animateTarget: revenueTarget,
    formatKey: revenueFmt,
    changePercent: changeFromSeries(revSpark),
    comparisonLabel: `last ${m.period_days} days`,
    asOfLabel: `Reporting currency ${m.currency}`,
    sparkline: revSpark.length ? revSpark : [{ i: 0, v: m.total_revenue }],
  };

  const primaryB: HomeKpiMetric = {
    id: "kpi-oar",
    title: "Net income",
    tier: "primary",
    animateTarget: niTarget,
    formatKey: niFmt,
    changePercent: changeFromSeries(niSpark),
    comparisonLabel: `last ${m.period_days} days`,
    asOfLabel: `Reporting currency ${m.currency}`,
    sparkline: niSpark.length ? niSpark : [{ i: 0, v: m.net_income }],
  };

  const compact: HomeKpiMetric[] = [
    {
      id: "kpi-cf",
      title: "Net cash flow",
      tier: "secondary",
      animateTarget: Math.abs(m.net_cash_flow),
      formatKey: pickFormatForAmount(m.net_cash_flow),
      changePercent: 0,
      comparisonLabel: "period total",
      sparkline: [{ i: 0, v: m.net_cash_flow }],
    },
    {
      id: "kpi-exp",
      title: "Total expenses",
      tier: "secondary",
      animateTarget: Math.abs(m.total_expenses),
      formatKey: pickFormatForAmount(m.total_expenses),
      changePercent: changeFromSeries(expSpark),
      comparisonLabel: `last ${m.period_days} days`,
      sparkline: expSpark.length ? expSpark : [{ i: 0, v: m.total_expenses }],
    },
    {
      id: "kpi-bal",
      title: "Balance",
      tier: "secondary",
      animateTarget: Math.abs(m.balance),
      formatKey: pickFormatForAmount(m.balance),
      changePercent: 0,
      comparisonLabel: "snapshot",
      sparkline: [{ i: 0, v: m.balance }],
    },
  ];

  if (marginSpark.length > 1) {
    compact.push({
      id: "kpi-margin",
      title: "Margin trend",
      tier: "secondary",
      animateTarget: Math.abs(m.average_margin ?? 0),
      formatKey: "months_1dp",
      changePercent: changeFromSeries(marginSpark),
      comparisonLabel: "monthly margin",
      sparkline: marginSpark,
    });
  }

  return [primaryA, primaryB, ...compact];
}

export function buildActionItemsFromSellerMetrics(
  s: SellerMetricsResponse
): HomeActionItem[] {
  const items: HomeActionItem[] = [];

  if (s.total_active_alerts > 0) {
    items.push({
      id: "api-alerts",
      label: "Active alerts",
      count: s.total_active_alerts,
      href: "/home",
      urgency: "attention",
      aiRelated: true,
    });
  }

  items.push({
    id: "api-counterparties",
    label: "Counterparties on file",
    count: s.total_counterparties,
    href: "/accounts-receivable/customers",
    urgency: "default",
  });

  return items;
}
