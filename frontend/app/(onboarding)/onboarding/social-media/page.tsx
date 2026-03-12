"use client";
import { motion } from "framer-motion";
import SocialMediaForm from "./SocialMediaForm";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { SuspenseWrapper } from "../SuspenseWrapper";
import OnboardingImageColumn from "@/components/onboarding-image-column";

export default function SocialMediaPage() {
  const { t } = useI18n();
  return (
    <div className="grid h-full w-full grid-cols-2">
      {/* Left: form */}
      <div className="flex items-stretch justify-center">
        <div className="flex h-full flex-col justify-between bg-white">
          {/* Language Selection */}
          <motion.div
            className="flex justify-center pt-3 pb-2 md:pt-6 md:pb-4"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="flex gap-2">
              <LanguageSwitcher />
            </div>
          </motion.div>
          {/* Form Content */}
          <SuspenseWrapper>
            <SocialMediaForm />
          </SuspenseWrapper>
          {/* Privacy Link */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="pb-3 text-center md:pb-6"
          >
            <motion.a
              href="/privacy-policy.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-primary underline hover:text-brand-primary-hover md:text-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="relative">
                {t("common.privacy_link")}
                <motion.span
                  className="absolute -bottom-1 left-0 h-0.5 bg-brand-primary"
                  initial={{ width: 0 }}
                  whileHover={{ width: "100%" }}
                  transition={{ duration: 0.2 }}
                />
              </span>
            </motion.a>
          </motion.div>
        </div>
      </div>

      {/* Right: image */}
      <OnboardingImageColumn
        stepImageSrc="/images/onboarding/business.webp"
        altText={t("alts.social_media_step")}
      />
    </div>
  );
}
