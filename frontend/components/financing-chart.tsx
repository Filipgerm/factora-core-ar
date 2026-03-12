"use client";

import { useState, useEffect } from "react";

interface RequestStatusEntry {
  status: "pending" | "approved" | "rejected";
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface FinancingChartProps {
  data: RequestStatusEntry[];
}

const RequestStatusTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: any[];
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const entry = payload[0];
  const count = entry?.value ?? 0;
  const percentage = entry?.payload?.percentage ?? 0;

  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 shadow-sm">
      <p className="font-semibold text-gray-900">{entry?.name}</p>
      <p className="mt-1">
        {count} {count === 1 ? "request" : "requests"} · {Math.round(percentage)}%
      </p>
    </div>
  );
};

export function FinancingChart({ data }: FinancingChartProps) {
  const [ChartComponents, setChartComponents] = useState<any>(null);

  useEffect(() => {
    // Dynamically import recharts only when component mounts
    import("recharts").then((recharts) => {
      setChartComponents({
        ResponsiveContainer: recharts.ResponsiveContainer,
        PieChart: recharts.PieChart,
        Pie: recharts.Pie,
        Cell: recharts.Cell,
        Tooltip: recharts.Tooltip,
      });
    });
  }, []);

  if (!ChartComponents) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-gray-500">
        Loading chart...
      </div>
    );
  }

  const { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } = ChartComponents;

  return (
    <>
      <div className="mx-auto h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              strokeWidth={0}
              paddingAngle={3}
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<RequestStatusTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-600 sm:grid-cols-3">
        {data.map((entry) => (
          <div
            key={entry.status}
            className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}</span>
            </div>
            <span className="font-semibold text-gray-900">
              {entry.value}
              <span className="ml-1 text-xs font-normal text-gray-400">
                ({Math.round(entry.percentage)}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

