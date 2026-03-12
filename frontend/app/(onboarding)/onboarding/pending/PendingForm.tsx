// Deprecated page, not used in the onboarding process

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChevronDown, Check } from "lucide-react";
import AnimatedFormHeader from "@/components/AnimatedFormHeader";
import NextStepButton from "@/components/NextStepButton";
import { useI18n } from "@/lib/i18n";

export default function PendingForm() {
  const { t } = useI18n();
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCompleted(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <form className="flex flex-1 flex-col items-center justify-center px-4 md:px-6">
      <div className="w-[500px] space-y-6 md:space-y-8">
        {/* Header with Back Button and Title */}
        <AnimatedFormHeader
          title={
            isCompleted
              ? t("onboarding.pending.completed_header")
              : t("onboarding.pending.header")
          }
        />

        {/* Pending/Completed Content */}
        <div className="space-y-4">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
            className="flex justify-center"
          >
            <AnimatePresence mode="wait">
              {!isCompleted ? (
                <motion.div
                  key="clock"
                  initial={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ duration: 0.5 }}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-primary-hover shadow-lg"
                >
                  <Clock className="h-10 w-10 text-white" />
                </motion.div>
              ) : (
                <motion.div
                  key="checkmark"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.6, type: "spring", bounce: 0.6 }}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-lg"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.4, type: "spring" }}
                  >
                    <Check className="h-10 w-10 text-white" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Main Message */}
          <AnimatePresence mode="wait">
            <motion.div
              key={isCompleted ? "completed" : "pending"}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              {!isCompleted ? (
                <>
                  <p className="text-xl leading-tight font-bold text-gray-900">
                    {t("onboarding.pending.main_message")}
                  </p>
                  <p className="text-xl leading-tight font-bold text-gray-900">
                    <span className="text-brand-primary">
                      {t("onboarding.pending.mydata_integration")}
                    </span>
                  </p>
                </>
              ) : (
                <motion.p
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, duration: 0.5, type: "spring" }}
                  className="text-xl leading-tight font-bold text-green-600"
                >
                  {t("onboarding.pending.completed_message")}
                </motion.p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Down Arrow (only show when pending) */}
          <AnimatePresence>
            {!isCompleted && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="flex justify-center"
              >
                <motion.div
                  animate={{ y: [0, 5, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    ease: "easeInOut",
                  }}
                >
                  <ChevronDown className="h-6 w-6 text-brand-primary" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Instruction */}
          <AnimatePresence mode="wait">
            <motion.div
              key={
                isCompleted ? "completed-instruction" : "pending-instruction"
              }
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-center"
            >
              <p className="text-sm leading-relaxed text-gray-600">
                {isCompleted
                  ? t("onboarding.pending.completed_instruction")
                  : t("onboarding.pending.instruction")}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Next Button (only show when completed) */}
        <AnimatePresence>
          {isCompleted && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{
                delay: 0.8,
                duration: 0.6,
                type: "spring",
                bounce: 0.3,
              }}
              className="flex justify-center"
            >
              <NextStepButton className="bg-brand-primary shadow-md hover:bg-brand-primary-hover" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
