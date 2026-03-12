// Deprecated page, not used in the onboarding process

"use client";

import { motion } from "framer-motion";
import PendingForm from "./PendingForm";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import OnboardingImageColumn from "@/components/onboarding-image-column";

export default function PendingPage() {
  const { t } = useI18n();
  return (
    <div className="grid h-full w-full grid-cols-2">
      {/* Left: form */}
      <div className="flex items-stretch justify-center">
        <div className="flex h-full flex-col justify-between bg-white">
          {/* Language Selection */}
          <motion.div
            className="flex justify-center pt-4 pb-3 md:pt-8 md:pb-6"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="flex gap-2">
              <LanguageSwitcher />
            </div>
          </motion.div>
          <div className="flex flex-1 flex-col justify-center">
            <PendingForm />
          </div>
          {/* Privacy Link */}
          <motion.div
            className="pb-4 text-center md:pb-8"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          >
            <motion.a
              href="/privacy-policy.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative text-xs text-brand-primary md:text-sm"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <span className="relative">
                {t("common.privacy_link")}
                <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-brand-primary transition-all duration-300 group-hover:w-full"></span>
              </span>
            </motion.a>
          </motion.div>
        </div>
      </div>

      {/* Right: image */}
      <OnboardingImageColumn
        stepImageSrc="/images/onboarding/pending.webp"
        altText={t("alts.onboarding_step")}
      />
    </div>
  );
}
