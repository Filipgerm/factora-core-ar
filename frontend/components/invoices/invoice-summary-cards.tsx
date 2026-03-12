"use client";

import { Receipt } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sensitive } from "@/components/ui/sensitive";
import { InvoiceStatusChart, RequestOutcomeChart } from "@/components/invoice-chart";
import { RequestOutcomeDonutEntry, RequestOutcomeSummary } from "@/lib/invoices/invoice-types";
import { CreditLimitRequest } from "@/lib/credit-limit-requests";
import invoiceConfig from "@/lib/data/invoice-config.json";

type InvoiceStatusEntry = {
  name: string;
  value: number;
  color: string;
  percentage: number;
};

interface InvoiceSummaryCardsProps {
  totalInvoiceCount: number;
  formattedTotalInvoiceAmount: string;
  invoiceStatusData: InvoiceStatusEntry[];
  requestOutcomeDonutData: RequestOutcomeDonutEntry[];
  requestOutcomeSummary: RequestOutcomeSummary;
}

export function InvoiceSummaryCards({
  totalInvoiceCount,
  formattedTotalInvoiceAmount,
  invoiceStatusData,
  requestOutcomeDonutData,
  requestOutcomeSummary,
}: InvoiceSummaryCardsProps) {
  const requestTypeOrder = invoiceConfig.requestTypeOrder as NonNullable<
    CreditLimitRequest["requestType"]
  >[];
  const requestTypeLabels: Record<
    NonNullable<CreditLimitRequest["requestType"]>,
    string
  > = {
    "credit limit": "Credit Limit",
    insurance: "Insurance",
  };
  const requestOutcomeColors = invoiceConfig.requestOutcomeColors as Record<
    NonNullable<CreditLimitRequest["requestType"]>,
    { approved: string; rejected: string }
  >;

  return (
    <div className="summary-grid grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card className="summary-card bg-white border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            Summary
          </CardTitle>
          <div className="rounded-lg bg-brand-primary-subtle p-2">
            <Receipt className="h-5 w-5 text-brand-primary" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 flex flex-col items-start justify-between gap-12">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total Invoices
            </div>
            <div className="mt-1 text-3xl font-bold text-slate-900">
              {totalInvoiceCount.toLocaleString("en-US")}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total Amount
            </div>
            <div className="mt-1 text-3xl font-bold text-slate-900">
              <Sensitive>{formattedTotalInvoiceAmount}</Sensitive>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="summary-card bg-white border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            Invoice Status
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Current invoice distribution
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {invoiceStatusData.length > 0 ? (
            <InvoiceStatusChart invoiceStatusData={invoiceStatusData} />
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-slate-500">
              No invoice status data
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="summary-card bg-white border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            Request Status
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Approved vs rejected by request type
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {requestOutcomeDonutData.length > 0 ? (
            <RequestOutcomeChart
              requestOutcomeDonutData={requestOutcomeDonutData}
              requestOutcomeSummary={requestOutcomeSummary}
              requestTypeOrder={requestTypeOrder}
              requestTypeLabels={requestTypeLabels}
              requestOutcomeColors={requestOutcomeColors}
            />
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-slate-500">
              No request outcomes yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

