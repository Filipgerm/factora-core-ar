"use client";

import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Suspense, useMemo, useState, useRef } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Building,
  User,
  Mail,
  Phone,
  FileText,
  History,
  TrendingUp,
  BarChart3,
  Users,
  Clock,
  Shield,
  Link,
  CheckCircle,
  Download,
  Eye,
  Star,
  Zap,
  ShoppingCart,
  MessageSquare,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CUSTOMERS_DATA, SALES_REPS, type Customer } from "@/lib/customers-data";
import { VisibleWhenCustomer } from "@/components/visible-when-customer";
import { getTopCustomersByPercentage } from "@/components/simple-customers-content";
import { useUser } from "@/components/user-context";
import { motion, AnimatePresence } from "framer-motion";

import { generateEmail, generatePhoneNumber } from "@/lib/utils/business_information_helpers";
import { assignCreditLimit } from "@/lib/utils/credit-limits";
import { HistoryTab } from "@/components/history-tab/history";
import { NotesTab } from "@/components/notes-tab/notes"
import { TradeReferencesTab } from "@/components/trade-references-tab/trade-references"
import { SummaryTab, CustomerStatusBadge } from "@/components/summary-tab/summary-tab"
import { BureauReportTab } from "@/components/bureau-report-tab/bureau-report";


// Lazy-load heavier sections for faster TTI
const MetricsGrid = dynamic(
  () => import("@/components/metrics-grid").then((m) => m.MetricsGrid),
  {
    ssr: false,
  }
);
const TransactionsTimelineContent = dynamic(
  () =>
    import("@/components/transactions-timeline-content").then(
      (m) => m.TransactionsTimelineContent
    ),
  { ssr: false }
);
const PLContent = dynamic(
  () => import("@/components/pl-content").then((m) => m.PLContent),
  { ssr: false }
);
const PLOverviewContent = dynamic(
  () =>
    import("@/components/pl-overview-content").then(
      (m) => m.PLOverviewContent
    ),
  { ssr: false }
);

// Interface for top customer data
interface TopCustomer {
  businessName: string;
  creditLimit: number; // in euros (30,000 to 100,000 with steps of 10,000)
}

const CREDIT_REPORT_PDFS = CUSTOMERS_DATA.reduce(
  (acc, customer) => {
    acc[customer.vatNumber] = `/documents/credit-reports/${customer.vatNumber}.pdf`;
    return acc;
  },
  {} as Record<string, string>
);

const MISSING_CREDIT_REPORT_VATS = new Set([
  "GB123456789",
  "PL123456789",
  "GB555666777",
]);

export default function CustomerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { userType } = useUser();
  const vat = params.vat as string;
  const [currentTab, setCurrentTab] = useState("summary");

  // Find the customer by VAT number
  const customer = CUSTOMERS_DATA.find(
    (cust) => cust.vatNumber.toLowerCase() === vat.toLowerCase()
  );

  if (!customer) {
    return (
      <main className="flex-1 overflow-y-auto bg-white min-h-screen">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>

          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <User className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Customer Not Found
            </h3>
            <p className="text-gray-600">
              The customer with VAT number "{vat}" could not be found.
            </p>
          </div>
        </div>
      </main>
    );
  }


  return (
    <main className="flex-1 overflow-y-auto bg-white min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {customer.name}
            </h1>
            <div className="flex items-center gap-4">
              <p className="text-gray-600">{customer.businessName}</p>
              <CustomerStatusBadge status={customer.status} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={currentTab}
          onValueChange={setCurrentTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-7 mb-6">
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Summary
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Cash Position
            </TabsTrigger>
            <TabsTrigger value="bureau-report" className="flex items-center gap-2">
              <Shield className="w-4 h-4" /> Bureau Report
            </TabsTrigger>
            <TabsTrigger value="pl" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              P&L Overview
            </TabsTrigger>
            <TabsTrigger value="trade-references" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Trade References
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab - Extracted to component */}
          <TabsContent value="summary">
            <SummaryTab customer={customer} userType={userType} />
          </TabsContent>

          {/* Transactions Timeline Tab */}
          <TabsContent value="transactions">
            <VisibleWhenCustomer
              requires={["bank"]}
              connectedServices={customer.connectedServices}
            >
              <div className="space-y-4 sm:space-y-6">
                <Suspense
                  fallback={
                    <div className="h-64 w-full animate-pulse rounded-md bg-slate-200" />
                  }
                >
                  <TransactionsTimelineContent
                    accounts={[
                      `GR12 0110 0120 0000 0001 2300 ${customer.id
                        .toString()
                        .padStart(3, "0")}`,
                      `GR45 0171 0120 0000 0009 8765 ${(customer.id + 100)
                        .toString()
                        .padStart(3, "0")}`,
                    ]}
                    connectedServices={customer.connectedServices}
                  />
                </Suspense>
              </div>
            </VisibleWhenCustomer>
          </TabsContent>

          {/* BUREAU REPORT TAB CONTENT */}
          <TabsContent value="bureau-report">
            <BureauReportTab />
          </TabsContent>

          {/* P&L Overview Tab */}
          <TabsContent value="pl">
            <VisibleWhenCustomer
              requires={["erp"]}
              connectedServices={customer.connectedServices}
            >
              <div className="space-y-4 sm:space-y-6">
                <Suspense
                  fallback={
                    <div className="h-96 w-full animate-pulse rounded-md bg-slate-200" />
                  }
                >
                  <PLOverviewContent
                    customerSlug={`customer-${customer.vatNumber.toLowerCase()}`}
                    connectedServices={customer.connectedServices}
                  />
                </Suspense>
              </div>
            </VisibleWhenCustomer>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <div className="max-w-5xl mx-auto">
              <HistoryTab customer={customer} />
            </div>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes">
            <div className="max-w-4xl mx-auto">
              <NotesTab customer={customer} />
            </div>
          </TabsContent>

          {/* Trade References Tab */}
          <TabsContent value="trade-references">
            <div className="max-w-4xl mx-auto">
              <TradeReferencesTab />
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </main>
  );
}