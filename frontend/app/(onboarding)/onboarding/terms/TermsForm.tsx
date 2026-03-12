"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import AnimatedFormHeader from "@/components/AnimatedFormHeader";
import { useOnboardingRouting } from "@/hooks/use-onboarding-routing";
import { useI18n } from "@/lib/i18n";

export default function TermsForm() {
  const { t } = useI18n();
  const pathname = usePathname();
  const currentStepId = pathname.split("/").filter(Boolean).pop() || "";
  const { pushWithParams } = useOnboardingRouting(currentStepId);
  const [acceptedTerms, setAcceptedTerms] = useState({
    general: false,
    client: false,
    banking: false,
    communications: false,
  });

  const handleTermAcceptance = (term: keyof typeof acceptedTerms) => {
    setAcceptedTerms((prev) => ({
      ...prev,
      [term]: !prev[term],
    }));
  };

  const handleAcceptAll = () => {
    setAcceptedTerms({
      general: true,
      client: true,
      banking: true,
      communications: true,
    });

    setTimeout(() => {
      pushWithParams(`/onboarding/application-review`);
    }, 600);
  };

  const requiredTermsAccepted =
    acceptedTerms.general && acceptedTerms.client && acceptedTerms.banking;

  const handleAcceptSelected = () => {
    if (!requiredTermsAccepted) return;
    pushWithParams(`/onboarding/application-review`);
  };

  return (
    <form className="flex h-full min-h-0 w-full flex-1 flex-col items-center px-4 py-1 md:px-8 md:py-2">
      <div className="flex h-full w-full max-w-4xl flex-1 min-h-0 flex-col space-y-3 md:space-y-4">

        <div className="shrink-0">
          <AnimatedFormHeader title={t("onboarding.terms.header")} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex-1 flex flex-col justify-center origin-top transform-gpu"
          style={{
            scale: '0.98',
          }}
        >
          <div className="text-sm text-gray-700 md:text-base">
            <div className="space-y-2 pb-2">
              <motion.button
                type="button"
                onClick={() => handleTermAcceptance("general")}
                className={`flex gap-3 rounded-lg p-2 transition-all duration-150 ${acceptedTerms.general
                  ? "border border-brand-primary-border bg-brand-primary-subtle"
                  : "border border-transparent hover:bg-gray-50"
                  }`}
                whileTap={{ scale: 0.99 }}
              >
                <div
                  className={`flex h-5 w-5 md:h-6 md:w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${acceptedTerms.general
                    ? "border-brand-primary bg-brand-primary"
                    : "border-brand-primary-border bg-white"
                    }`}
                >
                  {acceptedTerms.general && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0 text-left text-[11px] md:text-sm leading-snug text-gray-700">
                  {t("onboarding.terms.general_text")}
                </div>
              </motion.button>

              <motion.button
                type="button"
                onClick={() => handleTermAcceptance("client")}
                className={`flex gap-3 rounded-lg p-2 transition-all duration-150 ${acceptedTerms.client
                  ? "border border-brand-primary-border bg-brand-primary-subtle"
                  : "border border-transparent hover:bg-gray-50"
                  }`}
                whileTap={{ scale: 0.99 }}
              >
                <div
                  className={`flex h-5 w-5 md:h-6 md:w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${acceptedTerms.client
                    ? "border-brand-primary bg-brand-primary"
                    : "border-brand-primary-border bg-white"
                    }`}
                >
                  {acceptedTerms.client && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0 text-left text-[11px] md:text-sm leading-snug text-gray-700">
                  {t("onboarding.terms.client_text")}
                </div>
              </motion.button>

              <motion.button
                type="button"
                onClick={() => handleTermAcceptance("banking")}
                className={`flex gap-3 rounded-lg p-2 transition-all duration-150 ${acceptedTerms.banking
                  ? "border border-brand-primary-border bg-brand-primary-subtle"
                  : "border border-transparent hover:bg-gray-50"
                  }`}
                whileTap={{ scale: 0.99 }}
              >
                <div
                  className={`flex h-5 w-5 md:h-6 md:w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${acceptedTerms.banking
                    ? "border-brand-primary bg-brand-primary"
                    : "border-brand-primary-border bg-white"
                    }`}
                >
                  {acceptedTerms.banking && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0 text-left text-[11px] md:text-sm leading-snug text-gray-700">
                  {t("onboarding.terms.banking_text")}
                </div>
              </motion.button>

              <motion.button
                type="button"
                onClick={() => handleTermAcceptance("communications")}
                className={`flex gap-3 rounded-lg p-2 transition-all duration-150 ${acceptedTerms.communications
                  ? "border border-brand-primary-border bg-brand-primary-subtle"
                  : "border border-transparent hover:bg-gray-50"
                  }`}
                whileTap={{ scale: 0.99 }}
              >
                <div
                  className={`flex h-5 w-5 md:h-6 md:w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${acceptedTerms.communications
                    ? "border-brand-primary bg-brand-primary"
                    : "border-brand-primary-border bg-white"
                    }`}
                >
                  {acceptedTerms.communications && <Check className="h-3 w-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0 text-left text-[11px] md:text-sm leading-snug text-gray-700">
                  {t("onboarding.terms.communications_text")}
                </div>
              </motion.button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-2.5 shrink-0"
        >
          <Button
            className="h-10 w-full bg-brand-primary text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-brand-primary-hover md:h-11"
            type="button"
            onClick={handleAcceptAll}
          >
            {t("onboarding.terms.accept_all")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className={`h-10 w-full text-sm font-semibold md:h-11 ${requiredTermsAccepted
              ? "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200"
              : "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
              }`}
            type="button"
            disabled={!requiredTermsAccepted}
            onClick={handleAcceptSelected}
          >
            {t("onboarding.terms.accept_selected")}
          </Button>
        </motion.div>
      </div>
    </form>
  );
}