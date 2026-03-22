"use client";

import { Receipt } from "lucide-react";

import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";

export function ApBillsView() {
  return (
    <FeatureEmptyState
      icon={Receipt}
      title="Bills inbox"
      description="Vendor bills, approvals, and myDATA status will appear here when the accounts payable API is connected."
      ctaHref="/accounts-payable/vendors"
      ctaLabel="View vendors"
    />
  );
}
