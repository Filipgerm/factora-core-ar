"use client";

import { useState, useEffect } from "react";
import { ArrowRight, TrendingUp, ShieldCheck, Lock, Check } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { NewBankIntegrationContent } from "@/components/new-bank-integration-content";
import { useI18n } from "@/lib/i18n";
import Image from "next/image";
import { PoweredByFooter } from "@/components/PoweredByFooter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useOnboardingRouting } from "@/hooks/use-onboarding-routing";

interface Bank {
  id: string;
  name: string;
  fullName: string;
  description: string;
  logo: string;
  established?: string;
  headquarters?: string;
}

export default function BankSelectionForm() {
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showIntroNotice, setShowIntroNotice] = useState(
    searchParams.get("from") !== "bank-success" && searchParams.get("skipIntro") !== "true"
  );
  const { goToNextStep, goToPreviousStep, pushWithParams } = useOnboardingRouting("bank-selection");

  const handleBankSelect = (bank: Bank) => {
    // We just pass the bank name as an extra parameter.
    goToNextStep(false, { bank: bank.name })
  };

  const handleBack = () => {
    goToPreviousStep();
  };

  const handleTermsClick = () => {
    pushWithParams('/onboarding/terms');
  };

  const termsHeaderButton = (
    <button
      type="button"
      onClick={handleTermsClick}
      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-white to-gray-50 px-3 py-2 md:px-4 md:py-2 text-xs md:text-sm font-bold text-gray-800 shadow-sm transition-all duration-200 hover:from-gray-50 hover:to-gray-100 hover:shadow hover:scale-105 border border-gray-200"
    >
      Terms and Conditions
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </button>
  );


  return (
    <>
      <div className={`relative flex h-full w-full flex-col overflow-y-auto transition-all duration-500 ${showIntroNotice ? 'blur-md scale-[0.99] grayscale-[0.3]' : 'blur-0 scale-100 grayscale-0'}`}>
        {/* Top Right Action Button */}
        <div className="flex-1">
          <NewBankIntegrationContent
            onBack={handleBack}
            onBankSelect={handleBankSelect}
            backButtonText={t("onboarding.bank_selection.back")}
            headerAction={termsHeaderButton}
          />
        </div>

        {/* Factora Powered By Footer */}
        <PoweredByFooter
          showPrivacy={false}
          className="mt-auto py-8 bg-slate-50 border-t border-slate-200"
          centerLayout={true}
        />
      </div>

      {/* Intro Modal */}
      <AlertDialog open={showIntroNotice} onOpenChange={setShowIntroNotice}>
        <AlertDialogContent className="max-w-lg p-0 border-none shadow-2xl overflow-hidden bg-white gap-0">
          {/* Header Section */}
          <div className="bg-gradient-to-br from-brand-grad-start via-brand-primary to-white px-8 py-8 flex flex-col items-center text-center relative border-b border-brand-primary/20">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingUp className="w-24 h-24 text-white" />
            </div>

            <div className="h-16 w-16 rounded-full bg-white shadow-md border border-brand-primary/20 flex items-center justify-center mb-5 z-10">
              <TrendingUp className="w-8 h-8 text-brand-primary" />
            </div>

            <AlertDialogTitle className="text-2xl font-bold text-gray-900 z-10">
              {t("onboarding.bank_selection.intro_modal.title")}
            </AlertDialogTitle>
          </div>

          {/* Body Section */}
          <div className="px-8 py-6 space-y-5">
            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
              <p className="text-gray-700 text-base leading-relaxed text-center">
                <span className="font-semibold text-brand-primary block mb-1">
                  {t("onboarding.bank_selection.intro_modal.did_you_know")}
                </span>
                {t("onboarding.bank_selection.intro_modal.fact_prefix")}{" "}
                <span className="font-bold text-brand-primary text-lg">
                  {t("onboarding.bank_selection.intro_modal.fact_highlight")}
                </span>{" "}
                {t("onboarding.bank_selection.intro_modal.fact_suffix")}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-50 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-green-600" />
                </div>
                <span>{t("onboarding.bank_selection.intro_modal.benefit_1")}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-50 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-green-600" />
                </div>
                <span>{t("onboarding.bank_selection.intro_modal.benefit_2")}</span>
              </div>
            </div>

            {/* Trust Footer */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2">
              <ShieldCheck className="w-4 h-4" />
              <span className="font-medium">
                {t("onboarding.bank_selection.intro_modal.security_note")}
              </span>
            </div>
          </div>

          <AlertDialogFooter className="px-8 pb-8 flex flex-col gap-3 sm:flex-col sm:justify-center sm:space-x-0">
            {/* PRIMARY ACTION */}
            <AlertDialogAction
              onClick={() => setShowIntroNotice(false)}
              className="w-full h-12 text-base font-bold bg-brand-primary hover:bg-brand-primary/90 text-white shadow-lg transition-all hover:scale-[1.02] m-0"
            >
              {t("onboarding.bank_selection.intro_modal.primary_btn")}
            </AlertDialogAction>

            {/* SECONDARY ACTION */}
            <button
              onClick={() => pushWithParams('/onboarding/terms')}
              className="w-full py-2 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors bg-transparent hover:bg-gray-50 rounded-lg"
            >
              {t("onboarding.bank_selection.intro_modal.secondary_btn")}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}