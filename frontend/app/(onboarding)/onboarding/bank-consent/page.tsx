"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { useOnboardingRouting } from "@/hooks/use-onboarding-routing";

function BankConsentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const bankNameParam = searchParams.get("bank");
  const bankName = bankNameParam || "Your Bank";
  const demoParam = searchParams.get("demo");
  const speedParam = searchParams.get("speed");
  const { goToNextStep, goToPreviousStep } = useOnboardingRouting("bank-consent");

  const handleAgree = () => {
    goToNextStep();
  };

  return (
    <div className="flex w-full h-full items-center justify-center bg-gradient-to-br from-bank-consent-bg-start to-bank-consent-bg-end px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-xl rounded-xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-5 rounded-t-xl bg-bank-form-bg text-white">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5" />
            <h1 className="text-xl font-semibold">
              {t("onboarding.bank_consent.title", { bank: bankName })}
            </h1>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-card-foreground">
              {t("onboarding.bank_consent.subtitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("onboarding.bank_consent.description")}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-md font-medium text-card-foreground">
              {t("onboarding.bank_consent.sections.how_it_works.title")}
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["item1", "item2"].map((key) => (
                <li key={key} className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>
                    {t(
                      `onboarding.bank_consent.sections.how_it_works.items.${key}`
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-md font-medium text-card-foreground">
              {t("onboarding.bank_consent.sections.access_scope.title")}
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["item1", "item2"].map((key) => (
                <li key={key} className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>
                    {t(
                      `onboarding.bank_consent.sections.access_scope.items.${key}`
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-md font-medium text-card-foreground">
              {t("onboarding.bank_consent.sections.duration.title")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("onboarding.bank_consent.sections.duration.description")}
            </p>
          </div>
        </div>

        <div className="px-6 pb-6">
          <Button
            onClick={handleAgree}
            className="w-full bg-bank-form-primary hover:bg-bank-form-primary-hover text-white"
          >
            {t("onboarding.bank_consent.button")}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function BankConsentLoading() {
  return (
    <div className="flex w-full h-full items-center justify-center bg-gradient-to-br from-bank-consent-bg-start to-bank-consent-bg-end px-4 py-8">
      <div className="w-full max-w-xl rounded-xl border border-border bg-card text-card-foreground shadow-2xl">
        <div className="px-6 py-5 rounded-t-xl bg-bank-form-bg text-white">
          <div className="animate-pulse">
            <div className="h-5 w-48 bg-white/20 rounded mb-1"></div>
            <div className="h-4 w-64 bg-white/20 rounded"></div>
          </div>
        </div>
        <div className="px-6 py-6 space-y-4">
          <div className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded-md mb-4"></div>
            <div className="h-6 w-32 bg-gray-200 rounded mb-2"></div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-200 rounded"></div>
              <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
              <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
            </div>
            <div className="h-4 w-2/3 bg-gray-200 rounded mt-4"></div>
          </div>
        </div>
        <div className="px-6 pb-6">
          <div className="h-10 w-full bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export default function BankConsentPage() {
  return (
    <Suspense fallback={<BankConsentLoading />}>
      <BankConsentContent />
    </Suspense>
  );
}
