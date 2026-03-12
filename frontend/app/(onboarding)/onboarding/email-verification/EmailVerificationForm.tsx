"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import AnimatedFormHeader from "@/components/AnimatedFormHeader";
import { usePathname } from "next/navigation";
import { useOnboardingRouting } from "@/hooks/use-onboarding-routing";
import { DUMMY_EMAIL_CODE } from "@/app/lib/dummyCodes";
import { useI18n } from "@/lib/i18n";

export default function EmailVerificationForm() {
  const { t } = useI18n();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isValid, setIsValid] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(24);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const pathname = usePathname();
  const currentStepId = pathname.split("/").filter(Boolean).pop() || "";
  const { goToNextStep } = useOnboardingRouting(currentStepId);

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Artificial resend countdown timer (24s)
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const intervalId = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(intervalId);
  }, [secondsLeft]);

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (isInvalid) setIsInvalid(false);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }

    // When last digit filled, validate and advance on success (with artificial delay)
    if (value && index === 5) {
      const candidate = newCode.join("");
      setIsVerifying(true);
      setTimeout(() => {
        const isCorrect = candidate === DUMMY_EMAIL_CODE;
        setIsVerifying(false);
        if (isCorrect) {
          setIsValid(true);
          setIsInvalid(false);
          setTimeout(() => {
            goToNextStep();
          }, 200);
        } else {
          setIsValid(false);
          setIsInvalid(true);
          setTimeout(() => {
            setCode(["", "", "", "", "", ""]);
            setFocusedIndex(0);
            inputRefs.current[0]?.focus();
            setIsInvalid(false);
          }, 450);
        }
      }, 600);
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    // Handle backspace to go to previous input
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    }
  };

  const handleInputFocus = (index: number) => {
    setFocusedIndex(index);
  };

  return (
    <form
      className="flex flex-1 flex-col items-center justify-center px-4 md:px-6"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="w-[500px] space-y-6 md:space-y-8">
        {/* Header with Back Button and Title */}
        <AnimatedFormHeader title={t("onboarding.email_verification.header")} />

        {/* 6-Digit Code Input */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0.8, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <motion.div
              className="flex justify-center gap-2 md:gap-3"
              animate={
                isValid
                  ? { scale: [1, 1.08, 1] }
                  : isInvalid
                    ? { x: [0, -8, 8, -6, 6, -3, 3, 0] }
                    : undefined
              }
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                >
                  <Input
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    maxLength={1}
                    value={code[index]}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onFocus={() => handleInputFocus(index)}
                    className={`h-12 w-12 border-gray-300 text-center text-lg font-semibold focus:border-brand-primary focus:ring-brand-primary md:h-14 md:w-14 md:text-xl ${isValid
                      ? "border-green-500 bg-green-50"
                      : isInvalid
                        ? "border-red-500 bg-red-50"
                        : focusedIndex === index
                          ? "border-brand-primary bg-white shadow-md"
                          : "border-gray-300 bg-white"
                      }`}
                    placeholder=""
                    required
                    inputMode="numeric"
                    pattern="[0-9]"
                    autoComplete="one-time-code"
                    disabled={isVerifying}
                  />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Resend Code Link */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {secondsLeft > 0 ? (
            <p className="text-xs text-brand-primary md:text-sm">
              {t("onboarding.email_verification.resend_wait", {
                seconds: secondsLeft,
              })}
            </p>
          ) : (
            <p className="text-xs text-gray-600 md:text-sm">
              <span
                className="cursor-pointer font-medium text-brand-primary underline underline-offset-4"
                onClick={() => setSecondsLeft(24)}
              >
                {t("onboarding.email_verification.resend_ready")}
              </span>
            </p>
          )}
        </motion.div>

        {/* Next button removed: auto-advance on correct code */}
      </div>
    </form>
  );
}
