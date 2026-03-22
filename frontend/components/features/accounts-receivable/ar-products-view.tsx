"use client";

import { Package } from "lucide-react";

import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";

export function ArProductsView() {
  return (
    <FeatureEmptyState
      icon={Package}
      title="Product catalog"
      description="Product SKUs, pricing tiers, and myDATA categories will load here when the catalog API is available."
      ctaHref="/home"
      ctaLabel="Back to home"
    />
  );
}
