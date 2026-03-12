"use client";

import { motion } from "framer-motion";
import PhoneForm from "./PhoneForm";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { SuspenseWrapper } from "../SuspenseWrapper";
import OnboardingImageColumn from "@/components/onboarding-image-column";
import { DynamicBrandLogo } from "@/components/DynamicBrandLogo";
import { PoweredByFooter } from "@/components/PoweredByFooter";

export default function PhonePage() {
  const { t } = useI18n();
  return (
    <div className="grid h-full w-full grid-cols-2">
      {/* Left: form */}
      <div className="flex items-stretch justify-center">
        <div className="flex h-full flex-col justify-between bg-white">
          <div className="flex items-center justify-between px-6 pt-2 pb-2 md:px-10 md:pt-4 md:pb-4 shrink-0 z-50 relative">
            <DynamicBrandLogo className="relative w-32 h-16 md:w-40 md:h-20 shrink-0" />
            <div className="flex gap-2 shrink-0">
              <LanguageSwitcher />
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-center">
            <SuspenseWrapper>
              <PhoneForm />
            </SuspenseWrapper>
          </div>

          <PoweredByFooter />
        </div>
      </div>

      {/* Right: image */}
      <OnboardingImageColumn
        stepImageSrc="/images/onboarding/phone.webp"
        altText={t("alts.onboarding_step")}
      />
    </div>
  );
}
