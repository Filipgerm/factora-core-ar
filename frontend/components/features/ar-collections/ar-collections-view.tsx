"use client";

import { Mail } from "lucide-react";

import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";

export function ArCollectionsView() {
  return (
    <FeatureEmptyState
      icon={Mail}
      title="Collections workspace"
      description="Overdue invoices and AI-drafted follow-ups will surface here when the collections agent API is wired to live AR data."
      ctaHref="/accounts-receivable/invoices"
      ctaLabel="View receivables"
    />
  );
}
