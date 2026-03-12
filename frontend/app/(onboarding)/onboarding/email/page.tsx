"use client";

import { motion } from "framer-motion";
import EmailForm from "./EmailForm";
import { useI18n } from "@/lib/i18n";
import { SuspenseWrapper } from "../SuspenseWrapper";
import OnboardingImageColumn from "@/components/onboarding-image-column";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { PoweredByFooter } from "@/components/PoweredByFooter";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { DynamicBrandLogo } from "@/components/DynamicBrandLogo";

export default function EmailPage() {
  const { t } = useI18n();
  return (
    // Implemented the 60/40 grid layout to match the verification step
    <div className="grid h-full w-full grid-cols-1 lg:grid-cols-[60%_40%]">
      {/* Left: form & timeline */}
      <div className="flex h-full flex-col justify-between bg-white overflow-hidden">

        <div className="flex items-center justify-between px-6 pt-4 pb-3 md:px-10 md:pt-8 md:pb-6 shrink-0 z-50 relative">
          <DynamicBrandLogo className="relative w-32 h-16 md:w-40 md:h-20 shrink-0" />
          <div className="flex gap-2 shrink-0">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Added the vertical Stepper sidebar */}
          <div className="hidden md:flex flex-col w-[220px] shrink-0 px-6 py-8 border-r border-gray-100 overflow-y-auto custom-scrollbar">
            <OnboardingStepper variant="vertical" theme="light" />
          </div>

          {/* Form Content */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="flex-1 flex items-center justify-center p-6 md:p-8">
              <div className="w-full max-w-md">
                <SuspenseWrapper>
                  <EmailForm />
                </SuspenseWrapper>
              </div>
            </div>
            <PoweredByFooter centerLayout={true} className="pb-6 md:pb-8" />
          </div>
        </div>
      </div>

      {/* Right: image */}
      <div className="hidden lg:block h-full">
        <OnboardingImageColumn
          stepImageSrc="/images/onboarding/email.webp"
          altText={t("alts.email_step")}
        />
      </div>
    </div>
  );
}