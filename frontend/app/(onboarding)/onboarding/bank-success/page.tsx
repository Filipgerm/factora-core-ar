"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2, PlusCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { addIntegration } from "@/lib/integrations";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { useOnboardingRouting } from "@/hooks/use-onboarding-routing";

function BankSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [status, setStatus] = useState<"pending" | "success">("pending");
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const { pushWithParams, goToNextStep } = useOnboardingRouting("bank-success");

  // Capture the tracking source
  const source = searchParams.get("source");

  // 1. Audit Trail: Add bank integration to localStorage
  useEffect(() => {
    const bankName = searchParams.get("bank");
    if (bankName) {
      const bankId = `bank:${bankName.toLowerCase().replace(/\s+/g, "-")}`;
      addIntegration("bank", bankId, bankName);
    }
  }, [searchParams]);

  // 2. State Transition: Pending -> Success -> Modal
  useEffect(() => {
    const transitionTimer = setTimeout(() => {
      setStatus("success");
    }, 2000); // 2 seconds pending animation

    return () => clearTimeout(transitionTimer);
  }, []);

  // 3. Trigger Modal after Success Animation and Intercept dashboard-originated traffic
  useEffect(() => {
    if (status === "success") {
      const modalTimer = setTimeout(() => {
        if (source === "dashboard") {
          // Eject directly back to Integrations
          router.push("/integrations");
        } else {
          // Onboarding flow: show the Upsell modal
          setShowUpsellModal(true);
        }
      }, 2000);

      return () => clearTimeout(modalTimer);
    }
  }, [status, source, router]);

  // --- Navigation Handlers ---

  const handleConnectAnother = () => {
    // Loop back to Bank Selection - preserve all query params via engine
    pushWithParams("/onboarding/bank-selection", { from: "bank-success" });
  };

  const handleContinue = () => {
    // Proceed dynamically based on the configuration URL
    goToNextStep();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-page-bg-start to-brand-page-bg-end p-4 relative overflow-hidden">

      {/* Background Animated Elements (Optional Polish) */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        className="absolute top-0 right-0 w-96 h-96 bg-brand-primary-muted/20 rounded-full blur-3xl -z-10"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
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
                  <div className="mb-6">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-brand-primary-subtle to-brand-primary-muted flex items-center justify-center">
                      <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                    </div>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {t("onboarding.bank_success.pending_title")}
                  </h1>
                  <p className="text-gray-600 text-sm">
                    {t("onboarding.bank_success.pending_subtitle")}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }} // Modified exit for when modal covers it
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <div className="relative mb-6">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center shadow-inner">
                      <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {t("onboarding.bank_success.success_title")}
                  </h1>
                  <p className="text-gray-600 text-sm">
                    {t("onboarding.bank_success.success_subtitle")}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* --- IMPORTANT NOTICE MODAL --- */}
      <AnimatePresence>
        {showUpsellModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ring-1 ring-slate-900/5"
            >
              {/* Header: Institutional Blue */}
              <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-full flex-shrink-0">
                  <ShieldCheck className="w-6 h-6 text-blue-700" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Notice: Higher Credit Limits
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Maximize your credit potential.
                  </p>
                </div>
              </div>

              {/* Body: Educational Content */}
              <div className="p-6 space-y-4">
                <p className="text-slate-600 text-sm leading-relaxed">
                  You have successfully connected <strong className="text-slate-900">{searchParams.get("bank")}</strong>.
                </p>
                <div className="bg-brand-primary-subtle border border-brand-primary-border rounded-lg p-4">
                  <p className="text-sm text-brand-primary font-medium">
                    Did you know?
                  </p>
                  <p className="text-sm text-brand-primary/90 mt-1">
                    Companies with 2+ connected accounts create a stronger financial profile and are <strong className="underline">more likely</strong> to be approved for better payment terms.
                  </p>
                </div>
              </div>

              {/* Footer: Action Deck */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                {/* Primary Action: Connect Another (Highlighted) */}
                <Button
                  onClick={handleConnectAnother}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20 h-12 text-base"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Connect Another Bank
                </Button>

                {/* Secondary Action: Continue */}
                <Button
                  onClick={handleContinue}
                  variant="ghost"
                  className="flex-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200 h-12"
                >
                  No, Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BankSuccessLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-page-bg-start to-brand-page-bg-end p-4">
      <div className="w-full max-w-md">
        <Card className="bg-white border-0 shadow-xl shadow-indigo-100/50">
          <CardContent className="py-8 px-6">
            <div className="text-center animate-pulse">
              <div className="w-20 h-20 mx-auto rounded-full bg-slate-100 mb-6"></div>
              <div className="h-8 w-64 mx-auto bg-slate-100 rounded mb-2"></div>
              <div className="h-4 w-72 mx-auto bg-slate-100 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function BankSuccessPage() {
  return (
    <Suspense fallback={<BankSuccessLoading />}>
      <BankSuccessContent />
    </Suspense>
  );
}