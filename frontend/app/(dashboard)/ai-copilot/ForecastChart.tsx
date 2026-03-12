import { ChartSpec } from "@/types/chat";
import { motion } from "framer-motion";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ForecastChartProps {
  chart: ChartSpec;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `€${Math.round(value / 1000)}k`;
  return `€${Math.round(value)}`;
};

export function ForecastChart({ chart }: ForecastChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-xs">
          <p className="font-semibold mb-2 text-popover-foreground">{data.week}</p>
          <div className="space-y-1">
            <p className="text-muted-foreground">Opening: <span className="font-medium text-foreground">{formatCurrency(data.opening)}</span></p>
            <p className="text-green-600">Inflows: <span className="font-medium text-green-700">{formatCurrency(data.inflows)}</span></p>
            <p className="text-red-600">Outflows: <span className="font-medium text-red-700">{formatCurrency(data.outflows)}</span></p>
            <p className="text-muted-foreground">Net: <span className={`font-medium ${data.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(data.net)}</span></p>
            <p className="font-semibold text-blue-600 border-t pt-1 mt-1">Closing: {formatCurrency(data.closing)}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-lg border bg-card p-4"
    >
      <div className="mb-4">
        <h3 className="font-semibold text-card-foreground">{chart.title}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Assumptions: recent 8w collections & payables patterns; seasonality factor 1.1 every 4th week
        </p>
      </div>

      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart
          data={chart.data}
          margin={{ top: 10, right: 40, left: 20, bottom: 25 }}
          barCategoryGap="80%"
          barGap={20}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 14, fontWeight: 500 }}
            className="text-muted-foreground"
            interval={0}
            angle={0}
            textAnchor="middle"
            tickFormatter={(value) => {
              // Hide labels for even weeks (Wk 2, Wk 4, Wk 6, etc.)
              const weekNumber = parseInt(value.replace('Wk ', ''));
              return weekNumber % 2 === 0 ? '' : value;
            }}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            iconType="rect"
          />
          <Bar
            dataKey="inflows"
            fill="#10b981"
            name="Inflows"
            radius={[2, 2, 0, 0]}
            barSize={14}
          />
          <Bar
            dataKey="outflows"
            fill="#ef4444"
            name="Outflows"
            radius={[2, 2, 0, 0]}
            barSize={14}
          />
          <Line
            type="monotone"
            dataKey="closing"
            stroke="#3b82f6"
            strokeWidth={3}
            name="Closing Balance"
            dot={{ fill: "#3b82f6", r: 5, strokeWidth: 2, stroke: "#ffffff" }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

