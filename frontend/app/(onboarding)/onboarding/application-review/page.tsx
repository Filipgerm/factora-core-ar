"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { updateUserType } from "@/lib/auth";
import {
  ArrowRight,
  Check,
  CheckCircle,
  Building2,
  Globe,
  Users,
  Banknote,
  Briefcase,
  Mail,
  Phone,
  Link as LinkIcon,
  BadgeCheck,
  Pencil
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import Image from "next/image";
import { PoweredByFooter } from "@/components/PoweredByFooter";
import { DynamicBrandLogo } from "@/components/DynamicBrandLogo";

function ReviewItem({ label, value, icon: Icon, isLink }: { label: string, value: string, icon?: React.ElementType, isLink?: boolean }) {
  return (
    <div className="group flex items-center justify-between p-2.5 rounded-lg transition-colors hover:bg-slate-50 border border-transparent hover:border-slate-100">
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
        {isLink ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-primary hover:underline">
            {value}
          </a>
        ) : (
          <span className="text-sm font-semibold text-slate-800">{value}</span>
        )}
      </div>
      {Icon && (
        <Icon className="h-4 w-4 text-slate-300 transition-colors group-hover:text-brand-primary" />
      )}
    </div>
  );
}

export default function DataProcessingPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleContinue = () => {
    // 1. Trigger the success animation
    setIsSubmitted(true);

    // TEMPORARY update the user to buyer role for demo purposes 
    updateUserType("buyer");

    // 2. Wait 2 seconds (2000ms) then change pages
    setTimeout(() => {
      updateUserType("buyer");
      router.push("/home");
    }, 2000);
  };

  const handleEdit = () => {
    // Placeholder for edit functionality
    console.log("Edit clicked");
  };

  return (
    <main className="relative min-h-screen w-full bg-white">
      {/* Background pattern overlay at 5% opacity */}
      <div className="pointer-events-none absolute inset-0 bg-[url('/images/application-status/pattern.png')] bg-repeat opacity-5 fixed" />

      {/* Kleemann Logo */}
      <div className="fixed top-6 left-6 z-20">
        <DynamicBrandLogo className="relative w-32 h-12 md:w-40 md:h-16" />
      </div>

      {/* Main Content Grid */}
      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-8 px-6 lg:grid-cols-2">

        {/* Left Side - Sticky & Centered */}
        <div className="flex flex-col items-center justify-center gap-6 py-12 lg:py-0 lg:h-screen lg:sticky lg:top-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md space-y-8"
          >
            {/* Application Status Icon */}
            <div className="flex justify-center py-4">
              {!isSubmitted ? (
                /* Spinning Loader */
                <div className="relative h-24 w-24">
                  <div className="absolute inset-0 rounded-full border-8 border-brand-primary-border" />
                  <div className="absolute inset-0 animate-spin rounded-full border-8 border-brand-primary border-t-transparent [animation-duration:1.25s]" />
                </div>
              ) : (
                /* Success Checkmark */
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 15,
                    delay: 0.1
                  }}
                  className="relative h-24 w-24 flex items-center justify-center rounded-full bg-green-100 border-4 border-green-500 shadow-lg"
                >
                  <Check
                    className="h-12 w-12 text-green-600"
                    strokeWidth={4}
                  />
                </motion.div>
              )}
            </div>

            {/* Title */}
            <motion.h2
              key={isSubmitted ? "success" : "processing"}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center text-2xl font-bold text-brand-primary md:text-3xl"
            >
              {isSubmitted
                ? t("onboarding.data_processing.submitted_application_title")
                : t("onboarding.data_processing.reviewing_application_title")
              }
            </motion.h2>

            {/* Customer Support Message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="pt-8 text-center"
            >
              <p className="text-xs text-brand-primary font-medium leading-relaxed">
                Need help? Contact Factora Support<br />
                <span className="text-[10px] opacity-80">Mon-Fri, 9am-6pm</span>
                <br />
                <a href="mailto:info@factora.eu" className="underline decoration-brand-primary/30 underline-offset-2 hover:decoration-brand-primary hover:text-brand-primary transition-colors">
                  info@factora.eu
                </a>
              </p>
            </motion.div>

            {/* Powered By Factora */}
            <PoweredByFooter showPrivacy={false} className="mt-4" centerLayout={true} />

          </motion.div>
        </div>

        {/* Right Side - Review Cards & Actions */}
        <div className="flex flex-col justify-center gap-2.5 py-6 lg:py-12 w-full max-w-lg mx-auto lg:mx-0">
          {/* Company Identity Card */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-brand-primary" />
                <h2 className="text-lg font-semibold text-slate-900">
                  {t("application.status.company_name_label")}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-5 w-5 text-brand-primary" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-brand-primary hover:bg-brand-primary-subtle"
                  onClick={handleEdit}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              <ReviewItem label={t("application.status.company_name_label")} value={t("application.status.company_name")} />
              <ReviewItem label="VAT Number" value={t("application.status.vat_number")} />
              <ReviewItem label={t("application.status.legal_form_label")} value={t("application.status.legal_form")} />
              <ReviewItem label={t("application.status.country_label")} value={t("application.status.country")} icon={Globe} />
              <ReviewItem label={t("application.status.industry_label")} value={t("application.status.industry")} icon={Briefcase} />
              <div className="sm:col-span-2">
                <ReviewItem label={t("application.status.website_label")} value={t("application.status.website")} icon={LinkIcon} isLink />
              </div>
            </div>
          </motion.section>

          {/* Operational Details Card */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-primary" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Operational Details
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-brand-primary hover:bg-brand-primary-subtle"
                onClick={handleEdit}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <ReviewItem label="Credit Limit Requested" value="€15,000.00" icon={Banknote} />
              </div>
              <ReviewItem label={t("application.status.email_label")} value={t("application.status.review_demo_email")} icon={Mail} />
              <ReviewItem label={t("application.status.phone_label")} value={t("application.status.phone")} icon={Phone} />
              <div className="sm:col-span-2">
                <ReviewItem label="Billing Address" value={t("application.status.address")} icon={Building2} />
              </div>
            </div>
          </motion.section>

          {/* Continue Button (In Flow) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="pt-0"
          >
            <Button
              onClick={handleContinue}
              className="w-full h-11 bg-brand-primary text-white hover:bg-brand-primary-hover text-lg shadow-sm"
              disabled={isSubmitted}
            >
              {isSubmitted ? (
                <span className="flex items-center gap-2">
                  Application Submitted <Check className="h-5 w-5" />
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Confirm & Submit Application <ArrowRight className="h-5 w-5" />
                </span>
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </main >
  );
}