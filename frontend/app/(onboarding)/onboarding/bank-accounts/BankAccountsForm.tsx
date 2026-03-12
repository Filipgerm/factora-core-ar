"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import AnimatedFormHeader from "@/components/AnimatedFormHeader";
import NextStepButton from "@/components/NextStepButton";
import { usePathname, useSearchParams } from "next/navigation";
import { useOnboardingRouting } from "@/hooks/use-onboarding-routing";
import { useI18n } from "@/lib/i18n";
import { ONBOARDING_DEMO_CONFIG, delay } from "../demo-config";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: string;
  maskedNumber: string;
}

// Mock bank data - in real app this would come from previous step
const mockSelectedBank = {
  id: "piraeus",
  name: "Piraeus Bank",
};

const mockAccounts: Account[] = [
  {
    id: "checking",
    name: "Business Checking",
    type: "Checking",
    balance: "$12,450.00",
    maskedNumber: "•••• 1234",
  },
  {
    id: "savings",
    name: "Business Savings",
    type: "Savings",
    balance: "$45,230.00",
    maskedNumber: "•••• 5678",
  },
  {
    id: "credit",
    name: "Business Credit Card",
    type: "Credit Card",
    balance: "$2,340.00",
    maskedNumber: "•••• 3456",
  },
];

export default function BankAccountsForm() {
  const { t } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentStepId = pathname.split("/").filter(Boolean).pop() || "";
  const { goToNextStep } = useOnboardingRouting(currentStepId);

  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(
    mockAccounts.map((account) => account.id) // All selected by default
  );
  const [isLoading, setIsLoading] = useState(false);

  // Demo mode detection
  const isDemoMode = searchParams.get("demo") === "true";

  // Demo simulation
  useEffect(() => {
    if (!isDemoMode) return;

    const runDemo = async () => {
      // Wait a bit before starting
      await delay(1000);

      // Simulate user reviewing accounts (all already selected by default)
      await delay(2000);

      // Wait before moving to next step
      await delay(ONBOARDING_DEMO_CONFIG.delayBeforeNextStep);
    };

    runDemo();
  }, [isDemoMode]);

  const handleAccountToggle = (accountId: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (selectedAccounts.length === 0) return;

    setIsLoading(true);

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsLoading(false);

    goToNextStep();
  };

  const isFormValid = selectedAccounts.length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col items-center justify-center px-4 md:px-6"
    >
      <div className="w-[500px] space-y-6 md:space-y-8">
        {/* Header with Back Button and Title */}
        <AnimatedFormHeader title={t("onboarding.bank_accounts.header")} />

        {/* Accounts List */}
        <div className="space-y-3">
          {mockAccounts.map((account, index) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              className={`border rounded-lg p-4 transition-all duration-200 ${selectedAccounts.includes(account.id)
                ? "border-brand-primary bg-brand-primary-subtle"
                : "border-gray-200 bg-white hover:border-gray-300"
                }`}
            >
              <div className="flex items-center space-x-4">
                <Checkbox
                  id={account.id}
                  checked={selectedAccounts.includes(account.id)}
                  onCheckedChange={() => handleAccountToggle(account.id)}
                  className="h-5 w-5"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {account.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {account.type} • {account.maskedNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {account.balance}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Continue Button */}
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
