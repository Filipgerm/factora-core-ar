"use client";

import { notFound, useParams } from "next/navigation";

import { ArCustomerHubView } from "@/components/features/accounts-receivable/ar-customer-hub-view";
import { Skeleton } from "@/components/ui/skeleton";
import { useArCustomerRoute } from "@/lib/hooks/use-ar-customer-route";

export default function ArCustomerDetailPage() {
  const params = useParams();
  const customerId =
    typeof params.customerId === "string" ? params.customerId : "";
  const { customer, isLoading } = useArCustomerRoute(customerId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!customer) {
    notFound();
  }

  return (
    <ArCustomerHubView
      customerId={customer.id}
      legalName={customer.legalName}
      country={customer.country}
    />
  );
}
