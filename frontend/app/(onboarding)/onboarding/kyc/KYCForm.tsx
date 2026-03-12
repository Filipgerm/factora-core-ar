"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import AnimatedFormHeader from "@/components/AnimatedFormHeader";
import { User, Sun, Camera, Smartphone } from "lucide-react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useSearchParams } from "next/navigation";
import { ONBOARDING_DEMO_CONFIG, delay } from "../demo-config";
import { useOnboardingRouting } from "@/hooks/use-onboarding-routing";


export default function KYCForm() {
  const { t } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentStepId = pathname.split("/").filter(Boolean).pop() || "";
  const { pushWithParams } = useOnboardingRouting(currentStepId);
  const [selectedOption, setSelectedOption] = useState<string>("device");

  // Demo mode detection
  const isDemoMode = searchParams.get("demo") === "true";

  // Demo simulation
  useEffect(() => {
    if (!isDemoMode) return;

    const runDemo = async () => {
      // Wait a bit before starting
      await delay(1000);

      // Simulate selecting device option (already set as default)
      // The demo data shows "device" is already selected, so we just wait

      // Wait before moving to next step
      await delay(ONBOARDING_DEMO_CONFIG.delayBeforeNextStep);
    };

    runDemo();
  }, [isDemoMode]);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Main Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 md:px-6">
        <div className="w-[500px] space-y-6 md:space-y-8">
          {/* Header with Back Button and Title */}
          <AnimatedFormHeader title={t("onboarding.steps.kyc.title")} />

          {/* Information Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="rounded-lg border border-brand-primary-border bg-brand-primary-subtle p-3 md:p-4"
          >
            <p className="text-xs text-brand-primary md:text-sm">
              {t("onboarding.kyc.info", {
                default:
                  "It usually takes 5-10 minutes. You can proceed on this device or choose smartphone verification by receiving a link via SMS or scanning a QR code.",
              })}
            </p>
          </motion.div>

          {/* Verification Steps */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="space-y-4 md:space-y-6"
          >
            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="flex items-center gap-3 md:gap-4"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary-muted md:h-10 md:w-10">
                <User className="h-4 w-4 text-brand-primary md:h-5 md:w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 md:text-base">
                  {t("onboarding.kyc.step_prepare_id", {
                    default: "Prepare a valid government-issued ID",
                  })}
                </p>
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="flex items-center gap-3 md:gap-4"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary-muted md:h-10 md:w-10">
                <Sun className="h-4 w-4 text-brand-primary md:h-5 md:w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 md:text-base">
                  {t("onboarding.kyc.step_light", {
                    default: "Find a well-lit place",
                  })}
                </p>
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="flex items-center gap-3 md:gap-4"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary-muted md:h-10 md:w-10">
                <Camera className="h-4 w-4 text-brand-primary md:h-5 md:w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 md:text-base">
                  {t("onboarding.kyc.step_take_photos", {
                    default:
                      "Take your photos - ID and selfie, done in 20 seconds",
                  })}
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* Verification Options */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="space-y-3"
          >
            {/* Device Option */}
            <motion.button
              type="button"
              onClick={() => setSelectedOption("device")}
              className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-all duration-200 ${selectedOption === "device"
                ? "border-brand-primary bg-brand-primary-subtle"
                : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary-muted">
                <Camera className="h-5 w-5 text-brand-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 md:text-base">
                  {t("onboarding.kyc.option_device_title", {
                    default: "Start the verification on this device",
                  })}
                </h3>
                <p className="text-xs text-gray-500 md:text-sm">
                  {t("onboarding.kyc.option_device_desc", {
                    default: "Use your computer's camera for verification",
                  })}
                </p>
              </div>
              <div
                className={`h-4 w-4 rounded-full border-2 ${selectedOption === "device"
                  ? "border-brand-primary bg-brand-primary-subtle0"
                  : "border-gray-300"
                  }`}
              >
                {selectedOption === "device" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-full w-full rounded-full bg-white"
                    style={{ transform: "scale(0.3)" }}
                  />
                )}
              </div>
            </motion.button>

            {/* Mobile Option */}
            <motion.button
              type="button"
              onClick={() => setSelectedOption("mobile")}
              className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-all duration-200 ${selectedOption === "mobile"
                ? "border-brand-primary bg-brand-primary-subtle"
                : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary-muted">
                <Smartphone className="h-5 w-5 text-brand-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 md:text-base">
                  {t("onboarding.kyc.option_mobile_title", {
                    default: "Start on your mobile device",
                  })}
                </h3>
                <p className="text-xs text-gray-500 md:text-sm">
                  {t("onboarding.kyc.option_mobile_desc", {
                    default: "Receive a link via SMS or scan QR code",
                  })}
                </p>
              </div>
              <div
                className={`h-4 w-4 rounded-full border-2 ${selectedOption === "mobile"
                  ? "border-brand-primary bg-brand-primary-subtle0"
                  : "border-gray-300"
                  }`}
              >
                {selectedOption === "mobile" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-full w-full rounded-full bg-white"
                    style={{ transform: "scale(0.3)" }}
                  />
                )}
              </div>
            </motion.button>
          </motion.div>

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
          >
            <Button
              onClick={() => {
                pushWithParams("/onboarding/data-processing");
              }}
              className="h-10 w-full bg-brand-primary text-sm font-medium text-white hover:bg-brand-primary-hover md:h-12 md:text-base"
            >
              {selectedOption === "device"
                ? t("onboarding.kyc.cta_device", {
                  default: "Start verification on this device",
                })
                : t("onboarding.kyc.cta_mobile", {
                  default: "Send verification link",
                })}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
