"use client";

import { motion } from "framer-motion";
import BusinessLookupForm from "./BusinessLookupForm";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { SuspenseWrapper } from "../SuspenseWrapper";
import OnboardingImageColumn from "@/components/onboarding-image-column";
import { DynamicBrandLogo } from "@/components/DynamicBrandLogo";
import { PoweredByFooter } from "@/components/PoweredByFooter";
// Imported the Stepper component
import { OnboardingStepper } from "@/components/OnboardingStepper";

export default function BusinessLookupPage() {
  const { t } = useI18n();
  return (
    // Replaced grid-cols-2 with a precise 60/40 split on large screens
    <div className="grid h-full w-full grid-cols-1 lg:grid-cols-[60%_40%]">

      {/* Left Column: Header, Content (Stepper + Form), and Footer */}
      <div className="flex h-full flex-col justify-between bg-white overflow-hidden">

        <div className="flex items-center justify-between px-6 pt-4 pb-3 md:px-10 md:pt-8 md:pb-6 shrink-0 z-50 relative">
          <DynamicBrandLogo className="relative w-32 h-16 md:w-40 md:h-20 shrink-0" />
          <div className="flex gap-2 shrink-0">
            <LanguageSwitcher />
          </div>
        </div>
        {/* Middle: Flex container splitting the Stepper and the Form */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Rail: Vertical Stepper Sidebar */}
          {/* Embedded the vertical variant in a dedicated 220px column */}
          <div className="hidden md:flex flex-col w-[220px] shrink-0 px-6 py-8 border-r border-gray-100 overflow-y-auto custom-scrollbar">
            <OnboardingStepper variant="vertical" theme="light" />
          </div>

          {/* Right Area: The actual Form */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="flex-1 flex items-center justify-center p-6 md:p-8">
              <div className="w-full max-w-md">
                <SuspenseWrapper>
                  <BusinessLookupForm />
                </SuspenseWrapper>
              </div>
            </div>
            {/* Embedded the footer here with centerLayout enabled */}
            <PoweredByFooter centerLayout={true} className="pb-6 md:pb-8" />
          </div>
        </div>
      </div>

      {/* Right Column: Hero Image (Now taking exactly 40% of the viewport) */}
      <div className="hidden lg:block h-full">
        <OnboardingImageColumn
          stepImageSrc="/images/onboarding/business.webp"
          altText={t("alts.country_selector_step")}
        />
      </div>
    </div>
  );
}