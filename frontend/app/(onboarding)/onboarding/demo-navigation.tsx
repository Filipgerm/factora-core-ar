"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ONBOARDING_STEPS } from "@/lib/onboarding";
import { ONBOARDING_DEMO_CONFIG } from "./demo-config";

export function useOnboardingDemoNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isDemoMode = searchParams.get("demo") === "true";
  const isFastMode = searchParams.get("speed") === "fast";

  // Adjust timing based on mode
  const navigationDelay = isFastMode
    ? ONBOARDING_DEMO_CONFIG.delayBeforeNextStep / 2
    : ONBOARDING_DEMO_CONFIG.delayBeforeNextStep;

  useEffect(() => {
    if (!isDemoMode) return;

    const currentStepIndex = ONBOARDING_STEPS.findIndex((step) =>
      pathname.endsWith(step.id)
    );

    if (currentStepIndex === -1) return;

    // Don't auto-navigate on the last step
    if (currentStepIndex >= ONBOARDING_STEPS.length - 1) return;

    const timer = setTimeout(() => {
      const nextStep = ONBOARDING_STEPS[currentStepIndex + 1];
      if (nextStep) {
        // Preserve demo parameters in navigation
        const demoParams = new URLSearchParams();
        if (isDemoMode) demoParams.set("demo", "true");
        if (isFastMode) demoParams.set("speed", "fast");

        const queryString = demoParams.toString();
        const nextUrl = `/onboarding/${nextStep.id}${queryString ? `?${queryString}` : ""
          }`;

        console.log(`Demo navigation: Moving from ${pathname} to ${nextUrl}`);
        router.push(nextUrl);
      }
    }, navigationDelay);

    return () => clearTimeout(timer);
  }, [isDemoMode, isFastMode, pathname, router, searchParams, navigationDelay]);
}

// Component wrapper for demo navigation
export function OnboardingDemoNavigation({
  children,
}: {
  children: React.ReactNode;
}) {
  useOnboardingDemoNavigation();
  return <>{children}</>;
}
