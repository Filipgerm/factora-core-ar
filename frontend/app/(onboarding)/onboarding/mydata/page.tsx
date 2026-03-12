"use client";

import { motion } from "framer-motion";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MyDataForm from "./MyDataForm";
import { useI18n } from "@/lib/i18n";

export default function MyDataPage() {
  const { t } = useI18n();

  return (
    <div className="h-full w-full bg-white">
      {/* Background pattern overlay at 5% opacity */}
      <div className="pointer-events-none absolute inset-0 bg-[url('/images/application-status/pattern.png')] bg-repeat opacity-5" />
      {/* Full width content */}
      <div className="relative z-10 flex h-full w-full flex-col justify-between">
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

        {/* Form Content */}
        <MyDataForm />

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
  );
}
