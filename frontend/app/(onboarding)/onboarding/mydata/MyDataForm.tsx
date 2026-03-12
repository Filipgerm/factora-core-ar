"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import Image from "next/image";
import { useOnboardingRouting } from "@/hooks/use-onboarding-routing";


export default function MyDataForm() {
  const { t } = useI18n();
  const pathname = usePathname();
  const currentStepId = pathname.split("/").filter(Boolean).pop() || "";
  const { pushWithParams, goToPreviousStep } = useOnboardingRouting(currentStepId);

  const handleAccessMyData = () => {
    pushWithParams("/onboarding/redirect");
  };

  const handleBack = () => {
    goToPreviousStep();
  };

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        {/* Header with Back Button and Title */}
        <div className="mb-6 flex items-center justify-between">
          {/* Back Button */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border-gray-300 bg-white md:h-10 md:w-10"
            type="button"
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </Button>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-center text-xl font-bold text-gray-900 md:text-2xl"
          >
            {t("onboarding.mydata.header")}
          </motion.h1>

          {/* Spacer to balance the back button */}
          <div className="w-8 md:w-10"></div>
        </div>

        {/* Consent Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-6 rounded-lg border border-brand-primary-border bg-brand-primary-subtle p-3 md:p-4"
        >
          <p className="text-xs text-brand-primary md:text-sm">
            {t("onboarding.mydata.consent_text")}
          </p>
        </motion.div>

        {/* myDATA Access Button */}
        <motion.button
          onClick={handleAccessMyData}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex w-full items-center justify-between rounded-lg bg-gray-100 p-4 transition-all duration-200 hover:bg-gray-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center space-x-3">
            {/* AADE Logo */}
            <div className="flex h-14 w-20 items-center justify-center">
              <Image
                src="/images/myDATA/aade.svg"
                alt="AADE Logo"
                width={80}
                height={60}
                className="h-auto w-full"
              />
            </div>
          </div>

          {/* myDATA Logo and External Link Icon */}
          <div className="flex items-center space-x-2">
            <Image
              src="/images/myDATA/mydata.svg"
              alt="myDATA Logo"
              width={80}
              height={32}
              className="h-auto"
            />
            <ExternalLink className="h-4 w-4 text-gray-500" />
          </div>
        </motion.button>
      </motion.div>
    </div>
  );
}
