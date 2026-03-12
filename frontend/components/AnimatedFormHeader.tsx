"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getPreviousOnboardingStep } from "@/lib/onboarding";
import { useOnboardingRouting } from "@/hooks/use-onboarding-routing";

interface AnimatedFormHeaderProps {
  title: string;
  onBack?: () => void;
}

export default function AnimatedFormHeader({ title, onBack }: AnimatedFormHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentStepId = pathname.split("/").filter(Boolean).pop() || "";

  const { goToPreviousStep } = useOnboardingRouting(currentStepId);

  const excludeParam = searchParams.get("exclude");
  const excludedModules = excludeParam ? excludeParam.split(",") : [];
  const hasPrevStep = getPreviousOnboardingStep(currentStepId, excludedModules) !== null;

  const handleBack = () => {
    if (onBack) return onBack();
    if (hasPrevStep) goToPreviousStep();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-between"
    >
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-full border-gray-300 bg-white md:h-10 md:w-10"
        type="button"
        tabIndex={-1}
        onClick={handleBack}
        disabled={!hasPrevStep}
      >
        <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
      </Button>
      <h1 className="flex-1 text-center text-xl font-bold text-gray-900 md:text-2xl">
        {title}
      </h1>
      <div className="w-8 md:w-10"></div>
    </motion.div>
  );
}
