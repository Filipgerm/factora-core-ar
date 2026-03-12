"use client";

import { motion } from "framer-motion";
import EmailVerificationForm from "./EmailVerificationForm";
import { useI18n } from "@/lib/i18n";
import OnboardingImageColumn from "@/components/onboarding-image-column";
import { DynamicBrandLogo } from "@/components/DynamicBrandLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { PoweredByFooter } from "@/components/PoweredByFooter";
import { OnboardingStepper } from "@/components/OnboardingStepper";

export default function EmailVerificationPage() {
  const { t } = useI18n();
  return (
    <div className="grid h-full w-full grid-cols-1 lg:grid-cols-[60%_40%]">
      <div className="flex h-full flex-col justify-between bg-white overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-4 pb-3 md:px-10 md:pt-8 md:pb-6 shrink-0 z-50 relative">
          <DynamicBrandLogo className="relative w-32 h-16 md:w-40 md:h-20 shrink-0" />
          <div className="flex gap-2 shrink-0">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="hidden md:flex flex-col w-[220px] shrink-0 px-6 py-8 border-r border-gray-100 overflow-y-auto custom-scrollbar">
            <OnboardingStepper variant="vertical" theme="light" />
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="flex-1 flex items-center justify-center p-6 md:p-8">
              <div className="w-full max-w-md">
                <EmailVerificationForm />
              </div>
            </div>
            <PoweredByFooter centerLayout={true} className="pb-6 md:pb-8" />
          </div>
        </div>
      </div>

      <div className="hidden lg:block h-full">
        <OnboardingImageColumn
          stepImageSrc="/images/onboarding/email-verification.webp"
          altText={t("alts.email_verification_step")}
        />
      </div>
    </div>
  );
}