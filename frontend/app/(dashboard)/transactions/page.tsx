"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { CustomerPageWrapper } from "@/components/dashboard/customer-page-wrapper";
import { PageLayout } from "@/components/dashboard/page-layout";
import { PageContentSkeleton } from "@/components/dashboard/page-content-skeleton";
import { BUYER_VAT } from "@/lib/config/dashboard-config";

// Lazy-load the transactions component
const TransactionsTimelineContent = dynamic(
  () =>
    import("@/components/transactions-timeline-content").then(
      (m) => m.TransactionsTimelineContent
    ),
  { ssr: false }
);

export default function TransactionsPage() {
  return (
    <CustomerPageWrapper
      vatNumber={BUYER_VAT}
      requires={["bank"]}
    >
      {(customer) => (
        <PageLayout
          title="Transactions Timeline"
          description="View your financial transactions and account activity"
        >
          <div className="space-y-4 sm:space-y-6">
            <Suspense fallback={<PageContentSkeleton />}>
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
        </PageLayout>
      )}
    </CustomerPageWrapper>
  );
}
