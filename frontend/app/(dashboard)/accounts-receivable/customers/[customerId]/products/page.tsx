"use client";

import { notFound, useParams } from "next/navigation";

import { ArCustomerProductsView } from "@/components/features/accounts-receivable/ar-customer-products-view";
import { Skeleton } from "@/components/ui/skeleton";
import { useArCustomerRoute } from "@/lib/hooks/use-ar-customer-route";

export default function ArCustomerProductsPage() {
  const params = useParams();
  const customerId =
    typeof params.customerId === "string" ? params.customerId : "";
  const { customer, isLoading } = useArCustomerRoute(customerId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-72 rounded-lg" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!customer) {
    notFound();
  }

  return (
    <ArCustomerProductsView
      customerId={customer.id}
      legalName={customer.legalName}
    />
  );
}
