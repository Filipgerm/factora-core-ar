"use client";

import type { RiskResults as RiskResultsType } from "@/types/chat";
import { PD_SCALE_COLORS } from "@/lib/utils/ai-copilot";

interface RiskResultsProps {
  riskResults: RiskResultsType;
  formatCurrentTimestamp: () => string;
}

export function RiskResults({
  riskResults,
  formatCurrentTimestamp,
}: RiskResultsProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-sm font-medium">
        Our risk scoring engine determined the business can receive credit for
        up to 30 days and up to €100,000.
      </div>
      <div className="mb-3">
        <div className="text-sm font-medium text-slate-700">
          12-month Probability of Default
        </div>
        <div className="mt-2 flex items-center gap-2">
          {Array.from({ length: 9 }).map((_, i) => {
            const idx = i + 1;
            const active = idx === riskResults.pdIndex;
            const colorValue = PD_SCALE_COLORS[idx - 1] ?? "#22c55e";
            return (
              <div
                key={idx}
                className={`h-3 w-6 rounded`}
                style={{
                  backgroundColor: colorValue,
                  outline: active ? `2px solid ${colorValue}` : undefined,
                  outlineOffset: active ? 2 : undefined,
                }}
                title={`Index ${idx}`}
              />
            );
          })}
          <span className="ml-2 text-sm text-slate-700">
            Index {riskResults.pdIndex} — {riskResults.bandLabel}
          </span>
        </div>
      </div>
      <div className="text-sm text-slate-700 mb-3">{riskResults.summary}</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {riskResults.metrics.map((met: any, i: number) => (
          <div
            key={i}
            className="rounded-lg border border-slate-200 p-3 flex items-center justify-between"
          >
            <div className="text-xs text-slate-500">{met.label}</div>
            <div className="flex items-center gap-2">
              {met.trend === "up" && (
                <span className="text-emerald-600">▲</span>
              )}
              {met.trend === "down" && <span className="text-rose-600">▼</span>}
              {met.trend === "flat" && <span className="text-slate-400">•</span>}
              <div className="text-sm font-semibold text-slate-900">
                {met.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Adverse table */}
      <div className="mt-4 rounded-xl border border-slate-200">
        <div className="px-3 py-2 border-b border-slate-200">
          <div className="text-sm font-medium text-slate-700">
            Adverse Records Overview
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left font-medium px-3 py-2">Category</th>
                <th className="text-right font-medium px-3 py-2">Items</th>
                <th className="text-right font-medium px-3 py-2">Amount</th>
                <th className="text-right font-medium px-3 py-2">2025</th>
                <th className="text-right font-medium px-3 py-2">2024</th>
                <th className="text-right font-medium px-3 py-2">2023</th>
                <th className="text-right font-medium px-3 py-2">2022</th>
                <th className="text-right font-medium px-3 py-2">&lt;2022</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="px-3 py-2 text-slate-700">Payment Orders</td>
                <td className="px-3 py-2 text-right">5</td>
                <td className="px-3 py-2 text-right">62,500</td>
                <td className="px-3 py-2 text-right">4</td>
                <td className="px-3 py-2 text-right">1</td>
                <td className="px-3 py-2 text-right">0</td>
                <td className="px-3 py-2 text-right">0</td>
                <td className="px-3 py-2 text-right">0</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-slate-700">
                  Mortgages / Pre-notations
                </td>
                <td className="px-3 py-2 text-right">2</td>
                <td className="px-3 py-2 text-right">300,000</td>
                <td className="px-3 py-2 text-right">0</td>
                <td className="px-3 py-2 text-right">2</td>
                <td className="px-3 py-2 text-right">0</td>
                <td className="px-3 py-2 text-right">0</td>
                <td className="px-3 py-2 text-right">0</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-slate-700">Bounced Checks</td>
                <td className="px-3 py-2 text-right">3</td>
                <td className="px-3 py-2 text-right">4,500</td>
                <td className="px-3 py-2 text-right">2</td>
                <td className="px-3 py-2 text-right">1</td>
                <td className="px-3 py-2 text-right">0</td>
                <td className="px-3 py-2 text-right">0</td>
                <td className="px-3 py-2 text-right">0</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-slate-700">
                  Unpaid Bills of Exchange
                </td>
                <td className="px-3 py-2 text-right">1</td>
                <td className="px-3 py-2 text-right">100</td>
                <td className="px-3 py-2 text-right">0</td>
                <td className="px-3 py-2 text-right">1</td>
                <td className="px-3 py-2 text-right">0</td>
                <td className="px-3 py-2 text-right">0</td>
                <td className="px-3 py-2 text-right">0</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 border-t border-slate-200 text-xs text-slate-500">
          VAT lookups: 1 within last 90 days · Last check:{" "}
          {formatCurrentTimestamp()}
        </div>
      </div>

      {/* Mini charts block */}
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col min-h-[200px]">
          <div className="text-sm font-medium text-slate-700 mb-3">
            Sector Group Distribution by PD Index
          </div>
          {(() => {
            // Hardcoded histogram bars (1–20%)
            const pdDistribution = [3, 7, 12, 9, 15, 4, 18, 6, 11];
            const maxPercent = 20; // cap
            const companyIdx = riskResults.pdIndex;
            return (
              <div className="flex flex-col">
                <div className="flex items-end justify-between h-40 gap-2">
                  {pdDistribution.map((pct, i) => {
                    const idx = i + 1;
                    const color = PD_SCALE_COLORS[i] ?? "#22c55e";
                    const isCompany = idx === companyIdx;
                    return (
                      <div
                        key={idx}
                        className="flex-1 h-full flex items-end justify-center"
                      >
                        <div
                          className="w-5 rounded-t"
                          style={{
                            height: `${(pct / maxPercent) * 100}%`,
                            minHeight: "4px",
                            backgroundColor: color,
                            outline: isCompany ? `2px solid ${color}` : undefined,
                            outlineOffset: isCompany ? 2 : undefined,
                          }}
                          title={`Index ${idx}: ${pct}%`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center justify-between px-[6px]">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 text-center text-[11px] text-slate-600"
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-center text-xs text-slate-600">
                  Company Index: {companyIdx}
                </div>
              </div>
            );
          })()}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {(() => {
            const segments = [
              { label: "BETTER", value: 53, color: "#10b981" },
              { label: "SAME", value: 9, color: "#eab308" },
              { label: "WORSE", value: 39, color: "#ef4444" },
            ];
            return (
              <div className="h-full justify-between flex flex-col gap-3 pb-3">
                <div className="text-sm font-medium text-slate-700">
                  Company Index vs Sector Group Index
                </div>
                <div className="h-14 w-full rounded-md overflow-hidden flex shadow-inner">
                  {segments.map((s) => (
                    <div
                      key={s.label}
                      className="relative flex items-center justify-center text-white text-sm font-semibold"
                      style={{
                        width: `${s.value}%`,
                        backgroundColor: s.color,
                      }}
                      title={`${s.label}: ${s.value}%`}
                    >
                      <span className="drop-shadow-sm">{s.value}%</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-4 text-xs text-slate-600">
                  {segments.map((s) => (
                    <div key={s.label} className="flex items-center gap-1">
                      <span
                        className="inline-block h-3 w-3 rounded-sm"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.label}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

