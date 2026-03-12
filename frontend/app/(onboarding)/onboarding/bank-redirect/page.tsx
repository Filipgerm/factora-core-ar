"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Info, User, Lock, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { addIntegration } from "@/lib/integrations";
import { useI18n } from "@/lib/i18n";
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

interface BankAccount {
  id: string;
  name: string;
  iban: string;
  bic: string;
  available: string;
  booked: string;
  type: string;
}

const BANK_ACCOUNTS: BankAccount[] = [
  {
    id: "1",
    name: "Main Operating (EUR)",
    iban: "GR05 0110 1250 0000 0009 8765 432",
    bic: "PIRBGRAA",
    available: "€46,790.20",
    booked: "€48,213.75",
    type: "Checking",
  },
  {
    id: "2",
    name: "Payroll (EUR)",
    iban: "GR89 0110 2010 0000 0000 4567 889",
    bic: "PIRBGRAA",
    available: "€12,340.10",
    booked: "€12,340.10",
    type: "Checking",
  },

  {
    id: "3",
    name: "VAT / Tax (EUR)",
    iban: "GR94 0110 3100 0000 0000 0011 22",
    bic: "PIRBGRAA",
    available: "€8,500.00",
    booked: "€8,500.00",
    type: "Savings",
  },
];

const DEMO_CONFIG = {
  typingSpeed: 50,
  delayBetweenActions: 800,
  demoData: {
    username: "demo_user",
    password: "demo_password",
    accountIds: ["1", "2"], // Select first two accounts
  },
};

function BankRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const { goToNextStep, goToPreviousStep } = useOnboardingRouting("bank-redirect");

  // Demo mode state
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoInProgress, setDemoInProgress] = useState(false);

  // Confirmation dialog state
  const [showAbandonDialog, setShowAbandonDialog] = useState(false);

  // Demo version detection for speed adjustments
  const demoVersion = searchParams.get("version") || "v1";
  const fromBankConsent = searchParams.get("from") === "bank-consent";
  const isPitchVersion = demoVersion === "pitch" || fromBankConsent;
  const speedMultiplier =
    demoVersion === "v2" ? 0.75 : isPitchVersion ? 0.3 : 1.0; // Much faster for pitch or bank-consent

  // Get bank name and determine background color
  // If bank is Piraeus (or null/undefined), use yellow background
  // Otherwise, use blue gradient for other banks
  const bankParam = searchParams.get("bank");
  const bankName = bankParam || "Piraeus Bank";
  const isPiraeusBank =
    !bankParam || (bankParam && bankParam.toLowerCase().includes("piraeus"));
  const backgroundClass = isPiraeusBank
    ? "bg-[#ffd900]"
    : "bg-gradient-to-br from-bank-consent-bg-start to-bank-consent-bg-end";

  // Conditional colors for form elements based on bank
  const primaryButtonColor = isPiraeusBank
    ? "bg-[#FFD500] hover:bg-[#FFC400]"
    : "bg-bank-form-primary hover:bg-bank-form-primary-hover";
  const accentColor = isPiraeusBank ? "#ffd900" : "var(--bank-form-accent)";
  const focusRingColor = isPiraeusBank ? "focus:ring-yellow-400" : "focus:ring-bank-form-primary";
  const ringColor = isPiraeusBank ? "ring-[#ffd900]" : "ring-bank-form-primary";

  // Helper functions for speed-adjusted timings
  const getAdjustedTypingSpeed = () =>
    Math.round(DEMO_CONFIG.typingSpeed * speedMultiplier);
  const getAdjustedDelay = (delay: number) =>
    Math.round(delay * speedMultiplier);

  const handleLogin = () => {
    if (username && password) {
      setIsLoggedIn(true);
    }
  };

  const toggleAccount = (accountId: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  // Simulate typing in multiple fields simultaneously
  const simulateSimultaneousTyping = (
    fields: Array<{
      setValue: (value: string) => void;
      text: string;
    }>,
    speed: number = getAdjustedTypingSpeed()
  ): Promise<void> => {
    return new Promise((resolve) => {
      const maxLength = Math.max(...fields.map((field) => field.text.length));
      let index = 0;

      const interval = setInterval(() => {
        fields.forEach((field) => {
          if (index <= field.text.length) {
            field.setValue(field.text.substring(0, index));
          }
        });

        index++;

        if (index > maxLength) {
          clearInterval(interval);
          resolve();
        }
      }, speed);
    });
  };

  // Delay helper
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // Smooth scroll helper
  const smoothScrollBy = (amount: number): Promise<void> => {
    return new Promise((resolve) => {
      window.scrollBy({ top: amount, behavior: "smooth" });
      setTimeout(resolve, 500);
    });
  };

  const handleConnect = () => {
    console.log("Connecting accounts:", selectedAccounts);

    // Redirect based on source
    if (fromBankConsent) {
      // Add Piraeus Bank integration when coming from bank-consent
      addIntegration("bank", "piraeus-bank", "Piraeus Bank");

      // IMPORTANT: Redirect to business integrations when coming from bank-consent
      router.push("/integrations");
    } else {
      goToNextStep();
    }
  };

  const handleAbandon = () => {
    goToPreviousStep();
  };

  // Initialize demo mode from URL parameter
  // Only enable demo mode when coming from bank-consent (business flow), not onboarding
  useEffect(() => {
    const demoParam = searchParams.get("demo");
    if (demoParam === "true" && fromBankConsent) {
      setIsDemoMode(true);
      setDemoInProgress(true);
    }
  }, [searchParams, fromBankConsent]);

  // Auto-fill login credentials in demo mode
  useEffect(() => {
    if (!isDemoMode || !demoInProgress || isLoggedIn) return;

    const runLoginDemo = async () => {
      if (isPitchVersion) {
        // Pitch version: slower login flow for pitch (approximately 2x previous duration)
        // Scroll to top
        window.scrollTo({ top: 0, behavior: "smooth" });
        await delay(200);

        // Scroll down a bit to focus on form
        await smoothScrollBy(100);
        await delay(100);

        // Type username and password simultaneously
        await simulateSimultaneousTyping(
          [
            {
              setValue: setUsername,
              text: DEMO_CONFIG.demoData.username,
            },
            {
              setValue: setPassword,
              text: DEMO_CONFIG.demoData.password,
            },
          ],
          DEMO_CONFIG.typingSpeed //* 2
        );
        await delay(100);

        // Scroll to see the login button
        await smoothScrollBy(50);
        await delay(100);

        // Auto-login
        setIsLoggedIn(true);
      } else {
        // Original flow for non-pitch versions
        // Scroll to top
        window.scrollTo({ top: 0, behavior: "smooth" });
        await delay(500);

        await delay(getAdjustedDelay(DEMO_CONFIG.delayBetweenActions));

        // Scroll down a bit to focus on form
        await smoothScrollBy(100);

        // Type username and password simultaneously
        await simulateSimultaneousTyping(
          [
            {
              setValue: setUsername,
              text: DEMO_CONFIG.demoData.username,
            },
            {
              setValue: setPassword,
              text: DEMO_CONFIG.demoData.password,
            },
          ],
          getAdjustedTypingSpeed()
        );

        await delay(getAdjustedDelay(DEMO_CONFIG.delayBetweenActions));

        // Scroll to see the login button
        await smoothScrollBy(50);

        // Auto-login
        setIsLoggedIn(true);
      }
    };

    runLoginDemo();
  }, [isDemoMode, demoInProgress, isLoggedIn]);

  // Auto-select accounts and connect in demo mode
  useEffect(() => {
    if (!isDemoMode || !demoInProgress || !isLoggedIn) return;

    const runAccountSelectionDemo = async () => {
      if (isPitchVersion) {
        // Pitch version: slower account selection for pitch (approximately 2x previous duration)
        // Scroll to top for account selection
        window.scrollTo({ top: 0, behavior: "smooth" });
        await delay(200);

        // Scroll down to show accounts
        await smoothScrollBy(150);
        await delay(100);

        // Select accounts one by one with delay (slower for pitch)
        setSelectedAccounts([]);
        for (const accountId of DEMO_CONFIG.demoData.accountIds) {
          setSelectedAccounts((prev) => [...prev, accountId]);
          await delay(400);
        }

        // Scroll to see connect button
        await smoothScrollBy(100);
        await delay(100);

        // Auto-connect
        handleConnect();
      } else {
        // Original flow for non-pitch versions
        // Scroll to top for account selection
        window.scrollTo({ top: 0, behavior: "smooth" });
        await delay(500);

        await delay(getAdjustedDelay(DEMO_CONFIG.delayBetweenActions));

        // Scroll down to show accounts
        await smoothScrollBy(150);

        // Select accounts one by one
        for (const accountId of DEMO_CONFIG.demoData.accountIds) {
          setSelectedAccounts((prev) => [...prev, accountId]);
          await delay(getAdjustedDelay(DEMO_CONFIG.delayBetweenActions) / 2);
        }

        await delay(getAdjustedDelay(DEMO_CONFIG.delayBetweenActions));

        // Scroll to see connect button
        await smoothScrollBy(100);

        // Auto-connect
        handleConnect();
      }
    };

    runAccountSelectionDemo();
  }, [isDemoMode, demoInProgress, isLoggedIn]);

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${backgroundClass}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-xl bg-bank-form-bg shadow-2xl p-6 md:p-8"
      >
        {/* Header */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="text-xl md:text-2xl font-semibold text-white mb-6"
        >
          {!isLoggedIn
            ? t("onboarding.bank_redirect.login_header", { bank: bankName })
            : t("onboarding.bank_redirect.accounts_header")}
        </motion.h1>

        {/* Login Form */}
        {!isLoggedIn ? (
          <motion.div key="login-form">
            {/* Username Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
              className="mb-4"
            >
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  <User className="h-4 w-4" />
                </div>
                <Input
                  type="text"
                  placeholder={t(
                    "onboarding.bank_redirect.username_placeholder"
                  )}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 pl-10 pr-10 bg-gray-100 border-0 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-gray-300 rounded-none"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label="Username information"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
              <p
                className="text-bank-form-muted text-xs mt-2 cursor-pointer transition-colors"
                style={{ "--hover-color": accentColor } as React.CSSProperties}
                onMouseEnter={(e) => (e.currentTarget.style.color = accentColor)}
                onMouseLeave={(e) => (e.currentTarget.style.color = "")}
              >
                {t("onboarding.bank_redirect.forgot_username")}
              </p>
            </motion.div>

            {/* Password Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
              className="mb-6"
            >
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  type="password"
                  placeholder={t(
                    "onboarding.bank_redirect.password_placeholder"
                  )}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`h-11 pl-10 pr-10 bg-gray-100 border-0 text-gray-900 placeholder:text-gray-500 focus:ring-2 ${focusRingColor} rounded-none`}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label="Password information"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
              <p
                className="text-bank-form-muted text-xs mt-2 cursor-pointer transition-colors"
                style={{ "--hover-color": accentColor } as React.CSSProperties}
                onMouseEnter={(e) => (e.currentTarget.style.color = accentColor)}
                onMouseLeave={(e) => (e.currentTarget.style.color = "")}
              >
                {t("onboarding.bank_redirect.forgot_password")}
              </p>
            </motion.div>

            {/* Login Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
            >
              <Button
                className={`w-full h-11 ${primaryButtonColor} ${isPiraeusBank ? "text-black" : "text-white"} font-bold text-base transition-colors shadow-lg rounded-none`}
                onClick={handleLogin}
              >
                {t("onboarding.bank_redirect.login_button")}
              </Button>
            </motion.div>

            {/* Footer Link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
              className="mt-6 pt-6 border-t border-white/20"
            >
              <button
                type="button"
                onClick={() => setShowAbandonDialog(true)}
                className="text-bank-form-muted text-xs cursor-pointer transition-colors"
                style={{ "--hover-color": accentColor } as React.CSSProperties}
                onMouseEnter={(e) => (e.currentTarget.style.color = accentColor)}
                onMouseLeave={(e) => (e.currentTarget.style.color = "")}
              >
                {t("onboarding.bank_redirect.disable_access")}
              </button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div key="account-selection">
            {/* Account Selection */}
            <div className="space-y-3 mb-6">
              {BANK_ACCOUNTS.map((account, index) => (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.2 + index * 0.1,
                    ease: "easeOut",
                  }}
                  onClick={() => toggleAccount(account.id)}
                  className={`bg-white p-4 cursor-pointer transition-all ${selectedAccounts.includes(account.id)
                    ? `ring-2 ${ringColor}`
                    : "hover:bg-gray-50"
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="mt-0.5">
                        <Checkbox
                          checked={selectedAccounts.includes(account.id)}
                          onCheckedChange={() => toggleAccount(account.id)}
                          className="h-4 w-4 rounded-none border-2 data-[state=checked]:bg-bank-form-bg data-[state=checked]:border-bank-form-bg"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-900 mb-1">
                          {account.name}
                        </h3>
                        <div className="text-xs text-gray-600 space-y-0.5">
                          <p>
                            <span className="font-medium">
                              {t("onboarding.bank_redirect.labels.iban")}:
                            </span>{" "}
                            {account.iban}
                          </p>
                          <p>
                            <span className="font-medium">
                              {t("onboarding.bank_redirect.labels.bic")}:
                            </span>{" "}
                            {account.bic}
                          </p>
                          <div className="flex space-x-4 mt-1">
                            <p>
                              <span className="font-medium">
                                {t("onboarding.bank_redirect.labels.available")}
                                :
                              </span>{" "}
                              <span className="text-green-600 font-semibold">
                                {account.available}
                              </span>
                            </p>
                            <p>
                              <span className="font-medium">
                                {t("onboarding.bank_redirect.labels.booked")}:
                              </span>{" "}
                              {account.booked}
                            </p>
                            <p>
                              <span className="font-medium">
                                {t("onboarding.bank_redirect.labels.type")}:
                              </span>{" "}
                              {account.type}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {selectedAccounts.includes(account.id) && (
                      <CheckCircle className="h-5 w-5 text-bank-form-bg flex-shrink-0" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Connect Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
            >
              <Button
                className={`w-full h-11 ${primaryButtonColor} ${isPiraeusBank ? "text-black" : "text-white"} font-bold text-base transition-colors shadow-lg rounded-none`}
                onClick={handleConnect}
                disabled={selectedAccounts.length === 0}
              >
                {t("onboarding.bank_redirect.connect_accounts", {
                  count: selectedAccounts.length,
                })}
              </Button>
            </motion.div>

            {/* Back Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
            >
              <Button
                variant="ghost"
                className="w-full mt-3 text-bank-form-muted hover:bg-transparent text-sm"
                style={
                  {
                    "--hover-color": accentColor,
                  } as React.CSSProperties
                }
                onMouseEnter={(e) => (e.currentTarget.style.color = accentColor)}
                onMouseLeave={(e) => (e.currentTarget.style.color = "")}
                onClick={() => setIsLoggedIn(false)}
              >
                {t("onboarding.bank_redirect.back_button")}
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* Abandon Confirmation Dialog */}
        <AlertDialog open={showAbandonDialog} onOpenChange={setShowAbandonDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("onboarding.bank_redirect.abandon_confirmation.title")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t(
                  "onboarding.bank_redirect.abandon_confirmation.description"
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t("onboarding.bank_redirect.abandon_confirmation.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleAbandon}>
                {t("onboarding.bank_redirect.abandon_confirmation.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </div>
  );
}

function BankRedirectFallback() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bank-consent-bg-start to-bank-consent-bg-end">
      <div className="text-bank-form-bg">{t("common.loading")}</div>
    </div>
  );
}

export default function BankRedirectPage() {
  return (
    <Suspense fallback={<BankRedirectFallback />}>
      <BankRedirectContent />
    </Suspense>
  );
}
