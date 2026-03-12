"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sensitive } from "@/components/ui/sensitive";
import { usePrivacy } from "@/components/privacy-provider";
import { useChartAnimation, useChartHover } from "@/hooks/use-chart-animations";
import { useEffect, useMemo, useRef } from "react";
import { VisibleWhen } from "@/components/visible-when";
import { CashPositionChart } from "@/components/dashboard/CashPositionChart";

interface BankTransaction {
  id: string;
  date: string; // ISO date
  account: string;
  description: string;
  amountEur: number; // positive for credit, negative for debit
  category: "income" | "expense" | "transfer" | "cancelled";
}

interface ConnectedServices {
  bank: boolean;
  erp: boolean;
  ecommerce?: boolean;
  bankName?: string;
  erpName?: string;
  ecommerceName?: string;
}

interface TransactionsTimelineContentProps {
  accounts?: string[];
  connectedServices?: ConnectedServices;
}

export function TransactionsTimelineContent({
  accounts = [
    "GR12 0110 0120 0000 0001 2300 695",
    "GR45 0171 0120 0000 0009 8765 432",
  ],
  connectedServices,
}: TransactionsTimelineContentProps) {
  const { isDiscreet } = usePrivacy();
  const { containerRef, animateOnMount, addHoverEffects } = useChartAnimation();
  const { createTooltip, removeTooltip } = useChartHover();
  const hasAnimatedRef = useRef(false);

  // Demo transactions synthesized for timeline preview
  const transactions: BankTransaction[] = useMemo(() => {
    const base: BankTransaction[] = [
      {
        id: "t1",
        date: "2025-07-28",
        account: accounts[0],
        description: "Card purchase - Office Supplies",
        amountEur: -284.12,
        category: "expense",
      },
      {
        id: "t2",
        date: "2025-07-27",
        account: accounts[0],
        description: "Wire - Customer Invoice #1842",
        amountEur: 12840.0,
        category: "income",
      },
      {
        id: "t3",
        date: "2025-07-27",
        account: accounts[0],
        description: "Wire - Cancelled due to Insufficient funds",
        amountEur: 34160.0,
        category: "cancelled",
      },
      {
        id: "t4",
        date: "2025-07-26",
        account: accounts[1],
        description: "SEPA - Payroll Batch",
        amountEur: -15640.5,
        category: "expense",
      },
      {
        id: "t5",
        date: "2025-07-24",
        account: accounts[0],
        description: "Utilities - Electricity",
        amountEur: -820.73,
        category: "expense",
      },
      {
        id: "t6",
        date: "2025-07-22",
        account: accounts[1],
        description: "Rent - HQ",
        amountEur: -6450.0,
        category: "expense",
      },
      {
        id: "t7",
        date: "2025-07-20",
        account: accounts[0],
        description: "Wire - Customer Invoice #1837",
        amountEur: 9540.0,
        category: "income",
      },
      {
        id: "t8",
        date: "2025-07-19",
        account: accounts[1],
        description: "Insurance Premium",
        amountEur: -420.0,
        category: "expense",
      },
      {
        id: "t9",
        date: "2025-07-18",
        account: accounts[0],
        description: "Bank Transfer between accounts",
        amountEur: -5000.0,
        category: "transfer",
      },
      {
        id: "t10",
        date: "2025-07-18",
        account: accounts[1],
        description: "Bank Transfer between accounts",
        amountEur: 5000.0,
        category: "transfer",
      },
      {
        id: "t11",
        date: "2025-07-15",
        account: accounts[0],
        description: "Card purchase - Fuel",
        amountEur: -210.59,
        category: "expense",
      },
    ];
    return base.sort((a, b) => b.date.localeCompare(a.date));
  }, [accounts]);

  useEffect(() => {
    if (hasAnimatedRef.current) return;
    animateOnMount(".tx-balance-card", { delay: 0.05 });
    animateOnMount(".tx-kpi-card", { delay: 0.05 });
    animateOnMount(".tx-timeline-card", { delay: 0.1 });
    animateOnMount(".tx-category-table", { delay: 0.15 });
    addHoverEffects(".tx-balance-card", 1.02);
    addHoverEffects(".tx-kpi-card", 1.02);
    hasAnimatedRef.current = true;
  }, [animateOnMount, addHoverEffects]);

  // Calculate totals, excluding transfers between accounts
  const nonTransferTransactions = transactions.filter(
    (t) => t.category !== "transfer"
  );

  const totalCredits = nonTransferTransactions
    .filter((t) => t.amountEur > 0)
    .reduce((sum, t) => sum + t.amountEur, 0);
  const totalDebits = Math.abs(
    nonTransferTransactions
      .filter((t) => t.amountEur < 0)
      .reduce((sum, t) => sum + t.amountEur, 0)
  );

  const netFlow = totalCredits - totalDebits;

  // Calculate balance: starting balance + net flow from all non-transfer transactions
  // Use a reasonable starting balance estimate based on transaction pattern
  // For demo purposes, use a starting balance that makes sense with the transactions
  const STARTING_BALANCE = 50000; // Starting balance estimate
  const balance = STARTING_BALANCE + netFlow;

  // Map transaction descriptions to expense categories
  const mapTransactionToCategory = (description: string): string => {
    const desc = description.toLowerCase();
    if (desc.includes("office supplies") || desc.includes("fuel")) {
      return "Cost of Goods Sold (COGS)";
    }
    if (desc.includes("payroll")) {
      return "Salaries";
    }
    if (desc.includes("rent")) {
      return "Rent";
    }
    if (desc.includes("utilities") || desc.includes("electricity")) {
      return "Utilities";
    }
    if (desc.includes("insurance")) {
      return "Other Expenses";
    }
    // Default category for other expenses
    return "Other Expenses";
  };

  // Group transactions by category and calculate expense categories
  const expenseCategoriesMap = new Map<string, { amount: number; transactions: number }>();

  nonTransferTransactions
    .filter((t) => t.amountEur < 0) // Only expense transactions
    .forEach((t) => {
      const category = mapTransactionToCategory(t.description);
      const absAmount = Math.abs(t.amountEur);
      const existing = expenseCategoriesMap.get(category) || { amount: 0, transactions: 0 };
      expenseCategoriesMap.set(category, {
        amount: existing.amount + absAmount,
        transactions: existing.transactions + 1,
      });
    });

  // Convert map to array and calculate percentages
  const expenseCategories = Array.from(expenseCategoriesMap.entries()).map(([category, data]) => ({
    category,
    amount: Math.round(data.amount),
    transactions: data.transactions,
    avgAmount: data.transactions > 0 ? Math.round(data.amount / data.transactions) : 0,
    percentage: totalDebits > 0 ? parseFloat(((data.amount / totalDebits) * 100).toFixed(1)) : 0,
  }));

  // Sort by amount descending
  expenseCategories.sort((a, b) => b.amount - a.amount);

  const handleHover = (
    content: string,
    event: React.MouseEvent<HTMLElement, MouseEvent>
  ) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    createTooltip(content, rect.left + rect.width / 2, rect.top);
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-6">

      {/* Current Position Frame */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Current Position
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Balance */}
            <Card className="shadow-none border-slate-100 bg-slate-50/50">
              <CardHeader className="pb-2">
                <h3 className="text-sm font-bold text-slate-900">Balance</h3>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-foreground">
                  <Sensitive>€{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Sensitive>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Net Flow */}
            <Card className="shadow-none border-slate-100 bg-slate-50/50">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Net Cash Flow</h3>
                <Badge variant="secondary">30d</Badge>
              </CardHeader>
              <CardContent className="pt-0">
                <div className={`text-2xl font-bold ${netFlow >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  <Sensitive>€{netFlow.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Sensitive>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Accounts */}
            <Card className="shadow-none border-slate-100 bg-slate-50/50">
              <CardHeader className="pb-2">
                <h3 className="text-sm font-bold text-slate-900">Active Accounts</h3>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xs text-slate-700 font-mono space-y-1">
                  {accounts.map((a) => <div key={a} className="truncate tracking-tight">{a}</div>)}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Cash Position Analysis Chart */}
      <CashPositionChart />

      {/* Detailed Category Breakdown Table */}
      {
        expenseCategories.length > 0 && (
          <div className="tx-category-table bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="text-gray-900 font-semibold">
                Detailed Category Breakdown
              </div>
            </div>
            <VisibleWhen requires={["bank"]} connectedServices={connectedServices}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                        Category
                      </th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                        Total Amount
                      </th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                        Transactions
                      </th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                        Avg Amount
                      </th>
                      <th className="px-4 sm:px-6 py-4 text-left text-sm font-medium text-gray-900">
                        % of Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {expenseCategories.map((expense) => (
                      <tr
                        key={expense.category}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 font-medium">
                          {expense.category}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-rose-600 text-sm">
                          <Sensitive>
                            €{expense.amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Sensitive>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-gray-600 text-sm">
                          {expense.transactions}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-gray-600 text-sm">
                          <Sensitive>
                            €{expense.avgAmount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Sensitive>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-md bg-blue-500 text-white">
                            {expense.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </VisibleWhen>
          </div>
        )
      }
    </div >
  );
}
