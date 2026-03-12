"use client";

import { Button } from "@/components/ui/button";
import { Sensitive } from "@/components/ui/sensitive";
import { VisibleWhen } from "@/components/visible-when";
import { formatCurrency } from "@/lib/utils/format-currency";

interface ConnectedServices {
  bank: boolean;
  erp: boolean;
  ecommerce?: boolean;
  bankName?: string;
  erpName?: string;
  ecommerceName?: string;
}

interface MonthlyCashFlowData {
  monthKey: string;
  monthDisplay: string;
  inflow: number;
  outflow: number;
  netFlow: number;
}

interface PLCashFlowTableProps {
  monthlyCashFlowArray: MonthlyCashFlowData[];
  connectedServices?: ConnectedServices;
}

export function PLCashFlowTable({
  monthlyCashFlowArray,
  connectedServices,
}: PLCashFlowTableProps) {
  return (
    <div className="pl-detailed-card bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Monthly Cash Flow
        </h2>
        <Button className="rounded-lg bg-gradient-to-r from-brand-primary to-brand-grad-start hover:from-brand-primary-hover hover:to-brand-grad-start text-white text-sm px-4 py-2">
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
                    className="pl-pl-row hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                      {d.monthDisplay}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-emerald-600 text-sm">
                      <Sensitive>
                        {formatCurrency(d.inflow, "€", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Sensitive>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-rose-600 text-sm">
                      <Sensitive>
                        {formatCurrency(d.outflow, "€", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Sensitive>
                    </td>
                    <td
                      className={`px-4 sm:px-6 py-4 text-sm font-medium ${d.netFlow >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                    >
                      <Sensitive>
                        {formatCurrency(d.netFlow, "€", {
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
  );
}

