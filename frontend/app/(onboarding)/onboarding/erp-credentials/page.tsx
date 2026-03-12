"use client";
import { motion } from "framer-motion";
import ERPCredentialsForm from "./ERPCredentialsForm";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { SuspenseWrapper } from "../SuspenseWrapper";

export default function ERPCredentialsPage() {
  const { t } = useI18n();
  return (
    <div className="flex w-full h-full items-center justify-center bg-gradient-to-br from-bank-consent-bg-start to-bank-consent-bg-end px-4 py-8">
      {/* Centered white container */}
      <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Language Selection */}
        <motion.div
          className="flex justify-center pt-6 pb-4 md:pt-8 md:pb-6"
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
          <ERPCredentialsForm />
        </SuspenseWrapper>

        {/* Privacy Link */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="pb-6 text-center md:pb-8"
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
  );
}
