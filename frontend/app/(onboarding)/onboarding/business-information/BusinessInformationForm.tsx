"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import AnimatedFormHeader from "@/components/AnimatedFormHeader";
import NextStepButton from "@/components/NextStepButton";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function BusinessInformationForm() {
  const { t } = useI18n();

  const [requestedCreditLimit, setRequestedCreditLimit] = useState("");
  const [estimatedAnnualRevenue, setEstimatedAnnualRevenue] = useState("");
  const [averageOrderValue, setAverageOrderValue] = useState("");

  const isFormValid = useMemo(() => {
    return (
      requestedCreditLimit.trim().length > 0 &&
      estimatedAnnualRevenue.trim().length > 0 &&
      averageOrderValue.trim().length > 0
    );
  }, [requestedCreditLimit, estimatedAnnualRevenue, averageOrderValue]);

  return (
    <form className="flex flex-1 flex-col items-center justify-center px-4 md:px-6">
      <div className="w-full max-w-[500px] space-y-4 md:space-y-6">
        <AnimatedFormHeader title={t("onboarding.business_information.header", { defaultValue: "Business Information" })} />

        <div className="space-y-3 md:space-y-4">
          {/* 1. Requested Credit Limit */}
          <motion.div
            initial={{ opacity: 0.8, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="space-y-1"
          >
            <label className="text-sm font-semibold text-gray-900">
              {t("onboarding.business_information.requested_credit_limit", { defaultValue: "Requested Credit Limit" })}
            </label>
            <p className="text-xs text-gray-500 md:text-sm">
              {t("onboarding.business_information.requested_credit_limit_subtitle", { defaultValue: "The total credit line you are requesting for this partnership." })}
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 md:text-base">
                €
              </span>
              <Input
                value={requestedCreditLimit}
                onChange={(event) => setRequestedCreditLimit(event.target.value)}
                placeholder="e.g. 150000"
                className={cn(
                  "h-10 w-full border-gray-300 pl-8 text-sm focus:border-brand-primary focus:ring-brand-primary md:h-12 md:pl-9 md:text-base"
                )}
                inputMode="decimal"
              />
            </div>
          </motion.div>

          {/* 2. Estimated Annual Revenue (Specific to Partnership) */}
          <motion.div
            initial={{ opacity: 0.8, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut", delay: 0.05 }}
            className="space-y-1"
          >
            <label className="text-sm font-semibold text-gray-900">
              {t("onboarding.business_information.estimated_annual_revenue", { defaultValue: "Estimated Annual Volume" })}
            </label>
            <p className="text-xs text-gray-500 md:text-sm">
              {t("onboarding.business_information.estimated_annual_revenue_subtitle", { defaultValue: "The projected annual transaction volume you expect to conduct with us." })}
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 md:text-base">
                €
              </span>
              <Input
                value={estimatedAnnualRevenue}
                onChange={(event) => setEstimatedAnnualRevenue(event.target.value)}
                placeholder="e.g. 500000"
                className={cn(
                  "h-10 w-full border-gray-300 pl-8 text-sm focus:border-brand-primary focus:ring-brand-primary md:h-12 md:pl-9 md:text-base"
                )}
                inputMode="decimal"
              />
            </div>
          </motion.div>

          {/* 3. Average Order Value */}
          <motion.div
            initial={{ opacity: 0.8, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut", delay: 0.1 }}
            className="space-y-1"
          >
            <label className="text-sm font-semibold text-gray-900">
              {t("onboarding.business_information.average_order_value", { defaultValue: "Average Order Value (AOV)" })}
            </label>
            <p className="text-xs text-gray-500 md:text-sm">
              {t("onboarding.business_information.average_order_value_subtitle", { defaultValue: "The estimated monetary value of a typical single transaction." })}
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 md:text-base">
                €
              </span>
              <Input
                value={averageOrderValue}
                onChange={(event) => setAverageOrderValue(event.target.value)}
                placeholder="e.g. 15000"
                className={cn(
                  "h-10 w-full border-gray-300 pl-8 text-sm focus:border-brand-primary focus:ring-brand-primary md:h-12 md:pl-9 md:text-base"
                )}
                inputMode="decimal"
              />
            </div>
          </motion.div>

        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex justify-center"
        >
          {/* Standardized NextStepButton architecture handles dynamic routing */}
          <NextStepButton
            className={
              isFormValid
                ? "bg-brand-primary shadow-md hover:bg-brand-primary-hover w-full"
                : "cursor-not-allowed bg-gray-300 w-full"
            }
            disabled={!isFormValid}
          />
        </motion.div>
      </div>
    </form>
  );
}