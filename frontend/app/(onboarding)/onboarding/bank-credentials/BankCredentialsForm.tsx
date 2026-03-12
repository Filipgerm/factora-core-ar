"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import AnimatedFormHeader from "@/components/AnimatedFormHeader";
import NextStepButton from "@/components/NextStepButton";
import { usePathname, useSearchParams } from "next/navigation";
import { useOnboardingRouting } from "@/hooks/use-onboarding-routing";
import { useI18n } from "@/lib/i18n";
import { ONBOARDING_DEMO_CONFIG, simulateTyping, delay } from "../demo-config";

// Mock bank data - in real app this would come from previous step
const mockSelectedBank = {
  id: "piraeus",
  name: "Piraeus Bank",
  logo: "/images/banks/piraeus-bank.png",
};

export default function BankCredentialsForm() {
  const { t } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentStepId = pathname.split("/").filter(Boolean).pop() || "";
  const { goToNextStep } = useOnboardingRouting(currentStepId);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Demo mode detection
  const isDemoMode = searchParams.get("demo") === "true";

  // Demo simulation
  useEffect(() => {
    if (!isDemoMode) return;

    const runDemo = async () => {
      // Wait a bit before starting
      await delay(1000);

      // Simulate typing username
      await simulateTyping(
        setUsername,
        ONBOARDING_DEMO_CONFIG.demoData.bank.username
      );

      // Wait a bit
      await delay(500);

      // Simulate typing password
      await simulateTyping(
        setPassword,
        ONBOARDING_DEMO_CONFIG.demoData.bank.password
      );

      // Wait before moving to next step
      await delay(ONBOARDING_DEMO_CONFIG.delayBeforeNextStep);
    };

    runDemo();
  }, [isDemoMode]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!username || !password) return;

    setIsLoading(true);

    // Simulate authentication delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsLoading(false);

    goToNextStep();
  };

  const isFormValid = username.trim().length > 0 && password.trim().length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col items-center justify-center px-4 md:px-6"
    >
      <div className="w-[500px] space-y-6 md:space-y-8">
        {/* Header with Back Button and Title */}
        <AnimatedFormHeader title={t("onboarding.bank_credentials.header")} />

        {/* Bank Logo and Name */}
        <motion.div
          className="flex flex-col items-center space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="w-20 h-10 flex items-center justify-center bg-gray-100 rounded-lg">
            <Image
              src={mockSelectedBank.logo}
              alt={`${mockSelectedBank.name} logo`}
              width={80}
              height={40}
              className="max-w-[80px] max-h-[40px] w-auto h-auto object-contain"
              style={{ width: "auto", height: "auto" }}
            />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t("onboarding.bank_credentials.login_to", {
              bank: mockSelectedBank.name,
            })}
          </h2>
          <p className="text-gray-600 text-center">
            {t("onboarding.bank_credentials.description", {
              bank: mockSelectedBank.name,
            })}
          </p>
        </motion.div>

        {/* Credentials Form */}
        <div className="space-y-4">
          {/* Username Field */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("onboarding.bank_credentials.username")}
            </label>
            <Input
              type="text"
              placeholder={t(
                "onboarding.bank_credentials.username_placeholder"
              )}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-12 w-full border-gray-300 text-sm focus:border-brand-primary focus:ring-brand-primary md:h-14 md:text-base"
              required
              autoComplete="username"
            />
          </motion.div>

          {/* Password Field */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("onboarding.bank_credentials.password")}
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={t(
                  "onboarding.bank_credentials.password_placeholder"
                )}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full border-gray-300 pr-10 text-sm focus:border-brand-primary focus:ring-brand-primary md:h-14 md:text-base"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 md:h-5 md:w-5" />
                ) : (
                  <Eye className="h-4 w-4 md:h-5 md:w-5" />
                )}
              </button>
            </div>
          </motion.div>
        </div>

        {/* Disclaimer */}
        <motion.div
          className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-sm text-blue-800">
            By providing your {mockSelectedBank.name} credentials to Plaid,
            you're enabling Factora to retrieve your financial data.
          </p>
        </motion.div>

        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center"
        >
          <NextStepButton
            type="submit"
            className={isFormValid && !isLoading ? "" : "bg-gray-300"}
            disabled={!isFormValid || isLoading}
          />
        </motion.div>
      </div>
    </form>
  );
}
