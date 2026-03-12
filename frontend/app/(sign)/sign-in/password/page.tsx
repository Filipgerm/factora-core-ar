"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { signIn } from "@/lib/auth";
import { useState } from "react";

export const dynamic = "force-dynamic";

// Kaminaris S.A. VAT number from CUSTOMERS_DATA
const KAMINARIS_VAT = "EL123456789";

export default function PasswordSignInPage() {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleContinue() {
    if (password.length === 0 || confirmPassword.length === 0) {
      setError(t("errors.password_required"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("errors.passwords_do_not_match"));
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      // Sign in with buyer user type for password sign-in flow
      await signIn({ password }, "buyer");
      // Redirect to home page
      // Use window.location.href to force a full page reload, ensuring CSS is properly loaded
      window.location.href = "/home";
    } catch (err) {
      setError(t("errors.signin_failed") || "Sign in failed. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <motion.div
      className="relative flex items-center justify-center p-8 md:p-16"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Language Selection top center */}
      <motion.div
        className="absolute top-4 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
      >
        <div className="flex items-center justify-center gap-2">
          <LanguageSwitcher />
        </div>
      </motion.div>

      <motion.div
        className="w-full max-w-lg rounded-xl border bg-white p-8 shadow-sm md:p-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
      >
        <h2 className="mb-8 text-center text-sm font-semibold text-gray-700 uppercase">
          {t("login.shared.login_title")}
        </h2>

        <motion.div
          className="space-y-6"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: { staggerChildren: 0.08, delayChildren: 0.2 },
            },
          }}
        >
          <motion.div
            className="space-y-2"
            variants={{
              hidden: { opacity: 0, y: 12 },
              show: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <label className="text-xs font-medium text-gray-700">
              {t("labels.password")}
            </label>
            <Input
              type="password"
              placeholder={t("placeholders.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </motion.div>

          <motion.div
            className="space-y-2"
            variants={{
              hidden: { opacity: 0, y: 12 },
              show: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
          >
            <label className="text-xs font-medium text-gray-700">
              {t("labels.confirm_password")}
            </label>
            <Input
              type="password"
              placeholder={t("placeholders.confirm_password")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {error ? (
              <p className="text-xs text-red-600" role="alert">
                {error}
              </p>
            ) : null}
          </motion.div>

          <motion.div
            variants={{
              hidden: { opacity: 0, y: 12 },
              show: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          >
            <Button
              className="w-full bg-brand-primary hover:bg-brand-primary-hover"
              onClick={handleContinue}
              disabled={isLoading}
            >
              {isLoading ? t("common.loading") || "Loading..." : t("common.signin")}
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
