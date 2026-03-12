"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ONBOARDING_STEPS, getNextOnboardingStep } from "@/lib/onboarding";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useOnboardingRouting } from "@/hooks/use-onboarding-routing";

interface NextStepButtonProps {
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}

export default function NextStepButton({
  className,
  disabled,
  type = "button",
}: NextStepButtonProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const currentStepId = pathname.split("/").filter(Boolean).pop() || "";
  const { goToNextStep } = useOnboardingRouting(currentStepId);

  const excludeParam = searchParams.get("exclude");
  const excludedModules = excludeParam ? excludeParam.split(",") : [];

  const nextStepId = getNextOnboardingStep(currentStepId, excludedModules);
  const nextStep = nextStepId
    ? ONBOARDING_STEPS.find((s) => s.id === nextStepId)
    : undefined;

  // If there's no next step, we'll label it as completion
  const stepLabel = nextStep
    ? (() => {
      const id = nextStep.id;
      const title = nextStep.title;
      const translationKey = `onboarding.steps.${id}.title`;
      const translated = t(translationKey);
      // When key is missing, t() returns the key itself; use step's built-in title as fallback
      return translated !== translationKey ? translated : (title ?? id);
    })()
    : null;
  const labelText = stepLabel !== null
    ? t("common.next_with_step", { step: stepLabel })
    : t("common.complete_application");

  const handleClick = () => {
    if (type === "button") {
      goToNextStep();
    }
  };

  return (
    <Button
      onClick={handleClick}
      type={type}
      className={`h-12 w-auto bg-brand-primary px-6 text-base font-medium text-white hover:bg-brand-primary-hover ${className || ""
        }`}
      disabled={Boolean(disabled)}
    >
      {labelText}
      <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  );
}
