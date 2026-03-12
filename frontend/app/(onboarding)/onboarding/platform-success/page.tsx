"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2 } from "lucide-react";
import { addIntegration } from "@/lib/integrations";
import { useI18n } from "@/lib/i18n";
import { useOnboardingRouting } from "@/hooks/use-onboarding-routing";

function PlatformSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [status, setStatus] = useState<"pending" | "success">("pending");

  const { goToNextStep } = useOnboardingRouting("platform-success");

  // Add platform integration to localStorage
  useEffect(() => {
    const platformName = searchParams.get("platform");
    if (platformName) {
      // Create a platform ID from the name (e.g., "WooCommerce" -> "platform:woocommerce")
      const platformId = `platform:${platformName.toLowerCase().replace(/\s+/g, "-")}`;
      addIntegration("platform", platformId, platformName);
    }
  }, [searchParams]);

  // Transition from pending to success after 2 seconds
  useEffect(() => {
    const transitionTimer = setTimeout(() => {
      setStatus("success");
    }, 2000);

    return () => clearTimeout(transitionTimer);
  }, []);

  // Redirect 1 second after success state (total 3 seconds)
  useEffect(() => {
    if (status === "success") {
      const redirectTimer = setTimeout(() => {
        // Let the Elite Engine calculate the exact next step!
        goToNextStep();
      }, 1000);

      return () => clearTimeout(redirectTimer);
    }
  }, [status, goToNextStep]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-page-bg-start to-brand-page-bg-end p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <Card className="bg-white border-0 shadow-xl shadow-indigo-100/50">
          <CardContent className="py-8 px-6">
            <AnimatePresence mode="wait">
              {status === "pending" ? (
                <motion.div
                  key="pending"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  {/* Pending Icon */}
                  <div className="mb-6">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-brand-primary-subtle to-brand-primary-muted flex items-center justify-center">
                      <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                    </div>
                  </div>

                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {t("onboarding.platform_success.pending_title")}
                  </h1>
                  <p className="text-gray-600 text-sm">
                    {t("onboarding.platform_success.pending_subtitle")}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  {/* Success Icon */}
                  <div className="relative mb-6">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                      <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                  </div>

                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {t("onboarding.platform_success.success_title")}
                  </h1>
                  <p className="text-gray-600 text-sm">
                    {t("onboarding.platform_success.success_subtitle")}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function PlatformSuccessLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-page-bg-start to-brand-page-bg-end p-4">
      <div className="w-full max-w-md">
        <Card className="bg-white border-0 shadow-xl shadow-indigo-100/50">
          <CardContent className="py-8 px-6">
            <div className="text-center">
              <div className="animate-pulse">
                <div className="w-20 h-20 mx-auto rounded-full bg-gray-200 mb-6"></div>
                <div className="h-8 w-72 mx-auto bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-80 mx-auto bg-gray-200 rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PlatformSuccessPage() {
  return (
    <Suspense fallback={<PlatformSuccessLoading />}>
      <PlatformSuccessContent />
    </Suspense>
  );
}

