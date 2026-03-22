"use client";

import { FileSignature } from "lucide-react";

import { FeatureEmptyState } from "@/components/features/common/feature-empty-state";

export function ArContractsView() {
  return (
    <FeatureEmptyState
      icon={FileSignature}
      title="Contracts & revenue schedules"
      description="Subscription contracts and recognition schedules will appear here once contract billing is connected to the backend."
      ctaHref="/home"
      ctaLabel="Back to home"
    />
  );
}
