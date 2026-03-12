"use client";

import { useState, useEffect } from "react";

interface InvoiceStatusEntry {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface RequestOutcomeEntry {
  key: string;
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface RequestOutcomeSummary {
  "credit limit": { approved: number; rejected: number };
  insurance: { approved: number; rejected: number };
}

interface InvoiceChartProps {
  invoiceStatusData: InvoiceStatusEntry[];
  requestOutcomeDonutData: RequestOutcomeEntry[];
  requestOutcomeSummary: RequestOutcomeSummary;
  requestTypeOrder: Array<"credit limit" | "insurance">;
  requestTypeLabels: Record<"credit limit" | "insurance", string>;
  requestOutcomeColors: Record<
    "credit limit" | "insurance",
    { approved: string; rejected: string }
  >;
}

const SummaryDonutTooltip = ({ active, payload }: any) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const entry = payload[0];
  const count = entry?.value ?? 0;
  const percentage = entry?.payload?.percentage ?? 0;

  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
      <p className="font-semibold text-slate-900">{entry?.name}</p>
      <p className="mt-1">
        {count} {count === 1 ? "invoice" : "invoices"} · {Math.round(percentage)}%
      </p>
    </div>
  );
};

const RequestOutcomeTooltip = ({ active, payload }: any) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const entry = payload[0];
  const count = entry?.value ?? 0;
  const percentage = entry?.payload?.percentage ?? 0;

  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
      <p className="font-semibold text-slate-900">{entry?.name}</p>
      <p className="mt-1">
        {count} {count === 1 ? "request" : "requests"} · {Math.round(percentage)}%
      </p>
    </div>
  );
};

export function InvoiceStatusChart({ invoiceStatusData }: { invoiceStatusData: InvoiceStatusEntry[] }) {
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
      <div className="flex h-48 items-center justify-center text-sm text-slate-500">
        Loading chart...
      </div>
    );
  }

  const { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } = ChartComponents;

  return (
    <>
      <div className="mx-auto h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={invoiceStatusData}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={90}
              strokeWidth={0}
              paddingAngle={2}
            >
              {invoiceStatusData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<SummaryDonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600">
        {invoiceStatusData.map((entry) => (
          <div
            key={entry.name}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}</span>
            </div>
            <span className="font-medium text-slate-900">
              {entry.value}
              <span className="ml-1 text-[10px] font-normal text-slate-400">
                ({Math.round(entry.percentage)}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

export function RequestOutcomeChart({
  requestOutcomeDonutData,
  requestOutcomeSummary,
  requestTypeOrder,
  requestTypeLabels,
  requestOutcomeColors,
}: {
  requestOutcomeDonutData: RequestOutcomeEntry[];
  requestOutcomeSummary: RequestOutcomeSummary;
  requestTypeOrder: Array<"credit limit" | "insurance">;
  requestTypeLabels: Record<"credit limit" | "insurance", string>;
  requestOutcomeColors: Record<
    "credit limit" | "insurance",
    { approved: string; rejected: string }
  >;
}) {
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
      <div className="flex h-48 items-center justify-center text-sm text-slate-500">
        Loading chart...
      </div>
    );
  }

  const { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } = ChartComponents;

  return (
    <>
      <div className="mx-auto h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={requestOutcomeDonutData}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={90}
              strokeWidth={0}
              paddingAngle={2}
            >
              {requestOutcomeDonutData.map((entry) => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<RequestOutcomeTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid gap-3 text-xs text-slate-600">
        {requestTypeOrder.map((type) => {
          const summary = requestOutcomeSummary[type];
          const approvedKey = `${type}-approved`;
          const rejectedKey = `${type}-rejected`;
          const approvedEntry = requestOutcomeDonutData.find(
            (entry) => entry.key === approvedKey
          );
          const rejectedEntry = requestOutcomeDonutData.find(
            (entry) => entry.key === rejectedKey
          );

          if (!approvedEntry && !rejectedEntry) {
            return null;
          }

          return (
            <div
              key={type}
              className="rounded-lg border border-slate-200 px-3 py-2"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {requestTypeLabels[type]}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4">
                {approvedEntry ? (
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: requestOutcomeColors[type].approved,
                      }}
                    />
                    <span className="text-slate-500">
                      Approved{" "}
                      <span className="font-semibold text-slate-900">
                        {summary.approved.toLocaleString("en-US")}
                      </span>
                      <span className="ml-1 text-[10px] text-slate-400">
                        ({Math.round(approvedEntry.percentage)}%)
                      </span>
                    </span>
                  </div>
                ) : null}
                {rejectedEntry ? (
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: requestOutcomeColors[type].rejected,
                      }}
                    />
                    <span className="text-slate-500">
                      Rejected{" "}
                      <span className="font-semibold text-slate-900">
                        {summary.rejected.toLocaleString("en-US")}
                      </span>
                      <span className="ml-1 text-[10px] text-slate-400">
                        ({Math.round(rejectedEntry.percentage)}%)
                      </span>
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

