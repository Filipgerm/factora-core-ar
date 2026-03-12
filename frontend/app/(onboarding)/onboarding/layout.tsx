"use client";

import { ReactNode, Suspense } from "react";
import { ONBOARDING_STEPS } from "@/lib/onboarding";
import { usePathname } from "next/navigation";

import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { OnboardingDemoNavigation } from "./demo-navigation";
import Image from "next/image";

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const currentStepIndex = ONBOARDING_STEPS.findIndex((s) => {
    return pathname.endsWith(s.id);
  });

  const progressPercent =
    ((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <Suspense
      fallback={
        <div className="onboarding-theme flex h-dvh max-h-dvh flex-col overflow-hidden">
          {children}
        </div>
      }
    >
      <OnboardingDemoNavigation>
        <div className="onboarding-theme flex h-dvh max-h-dvh flex-col overflow-hidden">
          {/* Step content */}
          <div className="flex-1 overflow-y-hidden">{children}</div>

          {/* Progress bar */}
          {!pathname.includes("/redirect") &&
            !pathname.includes("/bank-success") &&
            !pathname.includes("/erp-success") &&
            !pathname.includes("/data-processing") && (
              <div className="h-2 w-full bg-gray-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-2 rounded-r-full bg-gradient-to-r from-brand-grad-start to-brand-grad-end shadow-[inset_0_0_2px_rgba(255,255,255,0.6)]"
                  aria-label={t("common.onboarding_progress")}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progressPercent)}
                />
              </div>
            )}
        </div>
      </OnboardingDemoNavigation>
    </Suspense>
  );
}
