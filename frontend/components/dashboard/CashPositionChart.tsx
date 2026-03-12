"use client";

import { useMemo, useState } from "react";
import {
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePrivacy } from "@/components/privacy-provider";
import { AlertCircle, Landmark } from "lucide-react";

// Mock data including negative values (overdrafts)
const data6m = [
    { date: "2024-10-15", cash: 175000 },
    { date: "2024-11-15", cash: 82000 },
    { date: "2024-12-15", cash: 40000 },
    { date: "2025-01-15", cash: 95000 },
    { date: "2025-02-15", cash: 110000 },
    { date: "2025-03-15", cash: 205000 },
];

const formatDate = (str: string) => {
    const d = new Date(str);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

export function CashPositionChart() {
    const { isDiscreet } = usePrivacy();
    const [range, setRange] = useState("6m");
    const [isAvgHovered, setIsAvgHovered] = useState(false);

    const activeData = data6m; // In real use, switch between data6m/data12m

    // Derived metrics for the selected period
    const metrics = useMemo(() => {
        const total = activeData.reduce((acc, curr) => acc + curr.cash, 0);
        return {
            average: total / activeData.length,
            nsfCount: 2, // Non-Sufficient Funds count
            liabilities: 45000, // Total liabilities on account
        };
    }, [activeData]);

    const formatCurrency = (value: number) => {
        if (isDiscreet) return "••••";
        return new Intl.NumberFormat("en-GB", {
            style: "currency",
            currency: "EUR",
            notation: "compact",
            maximumFractionDigits: 1,
        }).format(value);
    };

    // Custom SVG Component for the "Average Cloud"
    const CustomAverageLabel = (props: any) => {
        const { viewBox } = props;
        if (!viewBox || !isAvgHovered) return null; // Only render when the KPI is hovered

        const x = viewBox.width / 2;
        const y = viewBox.y;

        return (
            <g className="pointer-events-none">
                {/* The Triangle Pointer (Upside Down) */}
                <path
                    d={`M ${x - 6} ${y - 8} L ${x} ${y} L ${x + 6} ${y - 8} Z`}
                    fill="white"
                    stroke="#94a3b8"
                    strokeWidth="1"
                />

                {/* The "Cloud" (Callout Box) */}
                <rect
                    x={x - 55}
                    y={y - 42}
                    width={110}
                    height={34}
                    rx={8}
                    fill="white"
                    stroke="#94a3b8"
                    strokeWidth="1"
                    className="shadow-sm"
                />

                <text
                    x={x}
                    y={y - 28}
                    textAnchor="middle"
                    className="text-[9px] font-bold fill-slate-500 uppercase tracking-wider"
                >
                    Avg. Balance
                </text>

                <text
                    x={x}
                    y={y - 15}
                    textAnchor="middle"
                    className="text-xs font-extrabold fill-slate-800"
                >
                    {formatCurrency(metrics.average)}
                </text>
            </g>
        );
    };

    return (
        <Card className="shadow-sm border-slate-200 overflow-visible relative">
            <div className="absolute top-5 right-6 z-50">
                <Select value={range} onValueChange={setRange}>
                    <SelectTrigger className="w-[180px] h-10 border-slate-200 bg-white shadow-sm ring-offset-background focus:ring-brand-primary/20">
                        <SelectValue>
                            {range === "6m" ? "Last 6 Months" : "Last 12 Months"}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent align="end">
                        <SelectItem value="6m">Last 6 Months</SelectItem>
                        <SelectItem value="12m">Last 12 Months</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <CardHeader className="flex flex-col space-y-6 pb-2">
                <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                        Cash Position Analysis
                    </CardTitle>
                    <p className="text-xs text-slate-500 mt-1">
                        Historical liquidity performance.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                    {/* Average Balance Card - Triggers the Cloud on hover */}
                    <div
                        className={`flex flex-col p-4 rounded-xl border border-dashed transition-all duration-500 cursor-pointer relative group ${isAvgHovered
                            /* Stretches and enlarges gradually to a fixed upper limit (scale-102) */
                            ? "border-slate-400 bg-slate-100/50 shadow-inner scale-[1.02]"
                            : "border-slate-300 bg-slate-50/30 shadow-none scale-100"
                            }`}
                        onMouseEnter={() => setIsAvgHovered(true)}
                        onMouseLeave={() => setIsAvgHovered(false)}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] uppercase tracking-widest font-bold">
                                Avg. Monthly Balance
                            </span>
                            {/* The horizontal line in the card stretches its width on hover */}
                            <div className={`h-[2px] border-t-2 border-dashed border-slate-400 transition-all duration-500 ${isAvgHovered ? "w-12 opacity-100" : "w-8 opacity-60"
                                }`} />
                        </div>

                        <span className={`text-3xl font-extrabold tracking-tight transition-colors duration-500 ${isAvgHovered ? "text-slate-800" : "text-slate-900"
                            }`}>
                            {formatCurrency(metrics.average)}
                        </span>
                    </div>

                    {/* NSF - Deep Red shade */}
                    <div className="flex flex-col bg-red-50/50 rounded-xl p-3 border border-red-100">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertCircle size={14} className="text-red-700" />
                            <span className="text-[10px] uppercase tracking-widest text-red-700 font-bold">
                                NSF Occurrences
                            </span>
                        </div>
                        <span className="text-2xl font-bold text-red-800">
                            {metrics.nsfCount}
                        </span>
                    </div>

                    {/* Liabilities - Rose shade */}
                    <div className="flex flex-col bg-rose-50/50 rounded-xl p-3 border border-rose-100">
                        <div className="flex items-center gap-2 mb-1">
                            <Landmark size={14} className="text-rose-600" />
                            <span className="text-[10px] uppercase tracking-widest text-rose-600 font-bold">
                                Account Liabilities
                            </span>
                        </div>
                        <span className="text-2xl font-bold text-rose-900">
                            {formatCurrency(metrics.liabilities)}
                        </span>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <div className="h-[340px] w-full pt-8">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={activeData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0.01} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" tickFormatter={formatDate} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                            <YAxis tickFormatter={(val) => formatCurrency(val)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />

                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                formatter={(val: number) => [isDiscreet ? "••••" : `€${val.toLocaleString()}`, "Balance"]}
                                labelFormatter={formatDate}
                            />

                            <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 4" />

                            {/* THE CORRELATION BASELINE: Dynamically scales when the card is hovered */}
                            <ReferenceLine
                                y={metrics.average}
                                stroke="#94a3b8"
                                strokeWidth={isAvgHovered ? 4 : 2}
                                strokeDasharray="6 6"
                                // Custom label is only rendered inside the SVG when isAvgHovered is true
                                label={<CustomAverageLabel />}
                                className="transition-all duration-300"
                            />

                            <Area
                                type="monotone"
                                dataKey="cash"
                                stroke="var(--brand-primary)"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorCash)"
                                /* Inflection points */
                                dot={{
                                    r: 5,
                                    fill: "white",
                                    stroke: "var(--brand-primary)",
                                    strokeWidth: 2,
                                    fillOpacity: 1
                                }}
                                activeDot={{
                                    r: 7,
                                    stroke: "var(--brand-primary)",
                                    strokeWidth: 3,
                                    fill: "white"
                                }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}