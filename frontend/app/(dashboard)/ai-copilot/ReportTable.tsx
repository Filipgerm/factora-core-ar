import { FullReport } from "@/types/chat";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

interface ReportTableProps {
  report: FullReport;
}

const TrendIcon = ({ trend, metricKey }: { trend?: "up" | "down" | "flat"; metricKey: string }) => {
  // Determine color based on metric type and trend direction
  const getTrendColor = (trend: "up" | "down" | "flat", key: string) => {
    const lowerKey = key.toLowerCase();
    
    // DSO: Lower is better, so down arrow should be green
    if (lowerKey.includes('dso') && trend === "down") return "text-emerald-600";
    
    // DPO: Up arrow should be black (neutral)
    if (lowerKey.includes('dpo') && trend === "up") return "text-gray-700";
    
    // CCC: Lower is better, so down arrow should be green
    if (lowerKey.includes('ccc') && trend === "down") return "text-emerald-600";
    
    // AP Aging: Lower is better, so down arrow should be green
    if (lowerKey.includes('ap_aging') && trend === "down") return "text-emerald-600";
    
    // AR Aging: Lower is better, so down arrow should be green
    if (lowerKey.includes('ar_aging') && trend === "down") return "text-emerald-600";
    
    // Overdue collections: Lower is better, so down arrow should be green
    if (lowerKey.includes('overdue_collections') && trend === "down") return "text-emerald-600";
    
    // Overdue payments: Neutral, so black
    if (lowerKey.includes('overdue_payments')) return "text-gray-700";
    
    // Default: up = green, down = red, flat = gray
    if (trend === "up") return "text-emerald-600";
    if (trend === "down") return "text-red-600";
    return "text-gray-500";
  };
  
  const colorClass = getTrendColor(trend || "flat", metricKey);
  
  if (trend === "up") return <TrendingUp className={`h-4 w-4 ${colorClass}`} />;
  if (trend === "down") return <TrendingDown className={`h-4 w-4 ${colorClass}`} />;
  return <Minus className={`h-4 w-4 ${colorClass}`} />;
};

export function ReportTable({ report }: ReportTableProps) {
  const groupedMetrics = report.metrics.reduce((acc, metric) => {
    if (!acc[metric.group]) acc[metric.group] = [];
    acc[metric.group].push(metric);
    return acc;
  }, {} as Record<string, typeof report.metrics>);

  const groupOrder = [
    "Liquidity",
    "Working Capital Efficiency",
    "Collections & Payments Discipline",
    "Risk Signals",
    "Taxes & Statutory",
    "Costs & Returns",
    "Forecasts & Scenarios"
  ];

  // Helper function for ordinal suffixes
  const getOrdinalSuffix = (day: number) => {
    if (day >= 11 && day <= 13) {
      return 'th';
    }
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  // Use a stable date format to avoid hydration mismatches
  const date = new Date(report.asOf);
  const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  const asOfDate = `${month} ${day}${getOrdinalSuffix(day)} ${year} (Compared to last 30 days)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full min-w-full overflow-hidden rounded-lg border bg-card"
    >
      <div className="border-b bg-muted/30 px-6 py-4">
        <h3 className="font-semibold text-card-foreground">{report.title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">As of {asOfDate}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/10">
              <th className="px-6 py-3 text-left font-medium text-foreground min-w-[200px]">Metric</th>
              <th className="px-6 py-3 text-left font-medium text-foreground min-w-[140px]">Value</th>
              <th className="px-6 py-3 text-center font-medium text-foreground w-20">Trend</th>
              <th className="px-6 py-3 text-left font-medium text-foreground min-w-[300px]">Notes</th>
            </tr>
          </thead>
          <tbody>
            {groupOrder.map((groupName) => {
              const groupMetrics = groupedMetrics[groupName];
              if (!groupMetrics) return null;

              return (
                <motion.tr
                  key={groupName}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <td colSpan={4} className="border-b p-0">
                    <div className="bg-muted/20 px-6 py-3">
                      <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                        {groupName}
                      </h4>
                    </div>
                    <table className="w-full min-w-full">
                      <tbody>
                        {groupMetrics.map((metric, idx) => (
                          <tr
                            key={metric.key}
                            className={`border-b last:border-b-0 hover:bg-muted/5 transition-colors ${
                              idx % 2 === 0 ? 'bg-card' : 'bg-muted/5'
                            }`}
                          >
                            <td className="px-6 py-3 text-card-foreground align-top">
                              {metric.label}
                            </td>
                            <td className="px-6 py-3 font-medium text-card-foreground align-top">
                              {metric.value}
                            </td>
                            <td className="px-6 py-3 text-center align-top">
                              <div className="flex justify-center">
                                <TrendIcon trend={metric.trend} metricKey={metric.key} />
                              </div>
                            </td>
                            <td className="px-6 py-3 text-muted-foreground text-xs align-top">
                              {metric.notes}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
