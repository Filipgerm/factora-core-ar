"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import AnimatedFormHeader from "@/components/AnimatedFormHeader";
import NextStepButton from "@/components/NextStepButton";
import { useI18n } from "@/lib/i18n";
import { usePathname, useSearchParams } from "next/navigation";
import { ONBOARDING_DEMO_CONFIG, simulateTyping, delay } from "../demo-config";
import { useOnboardingRouting } from "@/hooks/use-onboarding-routing";

export default function EmailForm() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const pathname = usePathname();
  const currentStepId = pathname.split("/").filter(Boolean).pop() || "";
  const { goToNextStep } = useOnboardingRouting(currentStepId);

  // Demo mode detection
  const isDemoMode = searchParams.get("demo") === "true";

  // Demo simulation
  useEffect(() => {
    if (!isDemoMode) return;

    const runDemo = async () => {
      // Wait a bit before starting
      await delay(1000);

      // Simulate typing email address
      await simulateTyping(
        setEmail,
        ONBOARDING_DEMO_CONFIG.demoData.email.email
      );

      // Wait before moving to next step
      await delay(ONBOARDING_DEMO_CONFIG.delayBeforeNextStep);
    };

    runDemo();
  }, [isDemoMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.includes("@") && email.includes(".")) {
      goToNextStep();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col items-center justify-center px-4 md:px-6"
    >
      <div className="w-full space-y-6 md:space-y-8">
        {/* Header with Back Button and Title */}
        <AnimatedFormHeader title={t("onboarding.email.header")} />

        {/* Email Input */}
        <div className="space-y-4">
          <motion.div
            className="relative w-full"
            initial={{ opacity: 0.8, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="relative w-full">
              <Input
                type="email"
                placeholder=""
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
                className="h-12 w-full border-gray-300 text-sm focus:border-brand-primary focus:ring-brand-primary md:h-14 md:text-base"
                required
                inputMode="email"
                name="email"
                autoComplete="email"
                autoFocus
                title={t("onboarding.email.tooltip")}
              />
              <motion.label
                className={`absolute left-3 cursor-text text-gray-500 transition-colors ${email || isEmailFocused ? "text-brand-primary" : ""
                  }`}
                initial={{
                  top: "50%",
                  fontSize: "14px",
                  y: "-50%",
                }}
                animate={{
                  top: email || isEmailFocused ? "4px" : "50%",
                  fontSize: email || isEmailFocused ? "12px" : "14px",
                  y: email || isEmailFocused ? "0" : "-50%",
                }}
                transition={{
                  duration: 0.2,
                  ease: "easeOut",
                }}
              >
                {t("onboarding.email.label")}
              </motion.label>
            </div>
          </motion.div>
        </div>

        {/* Next Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <NextStepButton
            type="submit"
            className={`w-full ${email.includes("@") && email.includes(".")
              ? "bg-brand-primary shadow-md hover:bg-brand-primary-hover"
              : "cursor-not-allowed bg-gray-300"
              }`}
            disabled={!email.includes("@") || !email.includes(".")}
          />
        </motion.div>
      </div>
    </form>
  );
}
