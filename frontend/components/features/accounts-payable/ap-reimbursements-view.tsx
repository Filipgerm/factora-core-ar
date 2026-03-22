"use client";

import { Wallet } from "lucide-react";

import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";

export function ApReimbursementsView() {
  return (
    <FeatureEmptyState
      icon={Wallet}
      title="Reimbursements"
      description="Employee expense reports and approval workflows will show here when the reimbursements API is available."
      ctaHref="/home"
      ctaLabel="Back to home"
    />
  );
}
