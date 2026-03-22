"use client";

import { CreditCard } from "lucide-react";

import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";

export function ApChargesView() {
  return (
    <FeatureEmptyState
      icon={CreditCard}
      title="Card charges"
      description="Corporate card feeds and AI categorization will list here when card transaction APIs are wired."
      ctaHref="/integrations"
      ctaLabel="Integrations"
    />
  );
}
