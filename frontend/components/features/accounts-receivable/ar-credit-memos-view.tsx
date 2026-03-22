"use client";

import { FileMinus } from "lucide-react";

import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";

export function ArCreditMemosView() {
  return (
    <FeatureEmptyState
      icon={FileMinus}
      title="Credit memos"
      description="Credit notes and adjustments linked to invoices will list here when the credit memo API is available."
      ctaHref="/accounts-receivable/invoices"
      ctaLabel="View AADE documents"
    />
  );
}
