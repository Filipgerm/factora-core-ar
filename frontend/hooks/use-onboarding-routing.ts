"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  getNextOnboardingStep,
  getPreviousOnboardingStep,
} from "@/lib/onboarding";

export function useOnboardingRouting(currentStepId: string) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract excluded modules from URL (e.g., ?exclude=bank_connection,accounting)
  const excludeParam = searchParams.get("exclude");
  const excludedModules = excludeParam ? excludeParam.split(",") : [];

  // Helper to merge existing URL params (like ?exclude=... or ?demo=true) with new ones
  const buildQueryString = (
    targetPath: string,
    extraParams?: Record<string, string | null>,
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    if (extraParams) {
      Object.entries(extraParams).forEach(([key, value]) => {
        // Support explicit key deletion
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
    }

    // --- EPHEMERAL STATE PURGE ---
    // Automatically clean up bank connection keys when leaving the active flow.
    const isActiveBankFlow = [
      "bank-consent",
      "bank-credentials",
      "bank-accounts",
      "bank-redirect",
      "bank-success",
    ].some((step) => targetPath.includes(step));

    // If navigating to bank-selection, terms, or dashboard, this drops the queries natively.
    if (!isActiveBankFlow) {
      params.delete("bank");
      params.delete("source");
      params.delete("from");
    }
    const str = params.toString();
    return str ? `?${str}` : "";
  };

  const goToNextStep = (
    skipCurrentModule: boolean = false,
    extraParams?: Record<string, string | null>,
  ) => {
    const nextStepId = getNextOnboardingStep(
      currentStepId,
      excludedModules,
      skipCurrentModule,
    );

    if (nextStepId) {
      const path = `/onboarding/${nextStepId}`;
      router.push(`${path}${buildQueryString(path, extraParams)}`);
    } else {
      const path = "/home";
      router.push(`${path}${buildQueryString(path, extraParams)}`);
    }
  };

  const goToPreviousStep = (extraParams?: Record<string, string | null>) => {
    const prevStepId = getPreviousOnboardingStep(
      currentStepId,
      excludedModules,
    );

    if (prevStepId) {
      const path = `/onboarding/${prevStepId}`;
      router.push(`${path}${buildQueryString(path, extraParams)}`);
    }
  };

  const pushWithParams = (
    path: string,
    extraParams?: Record<string, string | null>,
  ) => {
    router.push(`${path}${buildQueryString(path, extraParams)}`);
  };

  return { goToNextStep, goToPreviousStep, pushWithParams };
}
