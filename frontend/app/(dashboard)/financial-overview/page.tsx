"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { CustomerPageWrapper } from "@/components/dashboard/customer-page-wrapper";
import { PageLayout } from "@/components/dashboard/page-layout";
import { PLContentSkeleton } from "@/components/pl/pl-content-skeleton";
import { BUYER_VAT } from "@/lib/config/dashboard-config";

// Lazy-load the P&L Overview component
const PLOverviewContent = dynamic(
  () =>
    import("@/components/pl-overview-content").then((m) => m.PLOverviewContent),
  { ssr: false }
);

export default function FinancialOverviewPage() {
  return (
    <CustomerPageWrapper vatNumber={BUYER_VAT} requires={["erp"]}>
      {(customer) => (
        <PageLayout
          title="P&L Overview"
          description="Profit & Loss overview for your business, including AR/AP and cash flow metrics"
        >
          <div className="space-y-4 sm:space-y-6">
            <Suspense fallback={<PLContentSkeleton />}>
              <PLOverviewContent
                customerSlug={`customer-${customer.vatNumber.toLowerCase()}`}
                connectedServices={customer.connectedServices}
              />
            </Suspense>
          </div>
        </PageLayout>
      )}
    </CustomerPageWrapper>
  );
}
