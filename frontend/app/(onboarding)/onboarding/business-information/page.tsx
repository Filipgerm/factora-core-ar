"use client";

import { motion } from "framer-motion";
import BusinessInformationForm from "./BusinessInformationForm";
import { useI18n } from "@/lib/i18n";
import { SuspenseWrapper } from "../SuspenseWrapper";
import OnboardingImageColumn from "@/components/onboarding-image-column";
import { DynamicBrandLogo } from "@/components/DynamicBrandLogo";
import { PoweredByFooter } from "@/components/PoweredByFooter";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function BusinessInformationPage() {
  const { t } = useI18n();

  return (
    <div className="grid h-full w-full grid-cols-1 lg:grid-cols-[60%_40%]">
      <div className="flex h-full flex-col justify-between bg-white overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-2 pb-2 md:px-10 md:pt-4 md:pb-4 shrink-0 z-50 relative">
          <DynamicBrandLogo className="relative w-32 h-16 md:w-40 md:h-20 shrink-0" />
          <div className="flex gap-2 shrink-0">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="hidden md:flex flex-col w-[220px] shrink-0 px-6 py-8 border-r border-gray-100 overflow-y-auto custom-scrollbar">
            <OnboardingStepper variant="vertical" theme="light" />
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
            <div className="flex-1 flex items-center justify-center p-4 md:p-6">
              <div className="w-full max-w-md">
                <SuspenseWrapper>
                  <BusinessInformationForm />
                </SuspenseWrapper>
              </div>
            </div>
            <PoweredByFooter centerLayout={true} className="pb-6 md:pb-8" />
          </div>
        </div>
      </div>

      <div className="hidden lg:block h-full">
        <OnboardingImageColumn
          stepImageSrc="/images/onboarding/business.webp"
          altText={t("alts.business_information_step")}
        />
      </div>
    </div>
  );
}