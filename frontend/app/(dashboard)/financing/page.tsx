"use client";

import { useUser } from "@/components/user-context";
import { PageLayout } from "@/components/dashboard/page-layout";
import { InvoicesContent } from "@/components/invoices-content";
import { BusinessFinancingPage } from "./business-financing";
import { BUYER_VAT } from "@/lib/config/dashboard-config";

function BuyerFinancingPage() {
  return (
    <PageLayout
      title="Financing"
      background="slate-50"
    >
      <InvoicesContent
        isIntegrated={true}
        vatNumber={BUYER_VAT}
        showRequestTypeColumn={true}
      />
    </PageLayout>
  );
}

export default function FinancingPage() {
  const { userType } = useUser();

  if (userType === "buyer") {
    return <BuyerFinancingPage />;
  }

  return <BusinessFinancingPage />;
}
