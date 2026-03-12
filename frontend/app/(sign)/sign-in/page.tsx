"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { signIn } from "@/lib/auth";
import { useState, Suspense } from "react";

export const dynamic = "force-dynamic";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn() {
    if (username.length === 0 || password.length === 0) {
      setError(t("errors.signin_required"));
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      // Sign in with financial_institution user type for regular sign-in flow
      await signIn(
        { username, password },
        "financial_institution"
      );
      // Redirect to home page
      window.location.href = "/home";
    } catch (err) {
      setError(t("errors.signin_failed") || "Sign in failed. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <motion.div
      className="relative flex flex-1 h-full w-full items-center justify-center p-8 md:p-16"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Language Selection top center */}
      <motion.div
        className="absolute top-8 right-8"
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
        <h2 className="mb-6 text-center text-sm font-semibold text-gray-700 uppercase">
          {t("login.shared.login_title")}
        </h2>

        <motion.div
          className="space-y-6"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: { staggerChildren: 0.08, delayChildren: 0.25 },
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
              {t("labels.email")}
            </label>
            <Input
              placeholder={t("placeholders.email")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              {t("labels.password")}
            </label>
            <Input
              type="password"
              placeholder={t("placeholders.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              className="w-full bg-brand-primary hover:bg-brand-primary-hover shadow-lg h-11 text-base transition-all active:scale-[0.98]"
              onClick={handleSignIn}
              disabled={isLoading}
            >
              {isLoading ? t("common.loading") || "Loading..." : t("common.signin")}
            </Button>
          </motion.div>
          <motion.div
            className="pt-4 text-center text-sm text-gray-600"
            variants={{
              hidden: { opacity: 0, y: 12 },
              show: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
          >
            <span>Don’t have an account? </span>
            <button
              type="button"
              className="font-medium text-brand-primary underline underline-offset-2 hover:text-brand-primary-hover"
              onClick={() => {
                const query = searchParams.toString();
                router.push(`/onboarding/phone${query ? `?${query}` : ""}`);
              }}
            >
              Create one!
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// Loading fallback component
function SignInLoading() {
  return (
    <div className="relative flex flex-1 h-full w-full items-center justify-center p-8 md:p-16">
      <div className="w-full max-w-lg rounded-xl border bg-white p-8 shadow-sm md:p-10">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-8"></div>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-20"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-16"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInForm />
    </Suspense>
  );
}
