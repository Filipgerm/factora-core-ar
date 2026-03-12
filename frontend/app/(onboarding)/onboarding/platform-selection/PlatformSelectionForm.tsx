"use client";

import { NewPlatformIntegrationContent } from "@/components/new-platform-integration-content";
import { useI18n } from "@/lib/i18n";
import { useOnboardingRouting } from "@/hooks/use-onboarding-routing";

interface Platform {
  id: string;
  name: string;
  fullName: string;
  description: string;
  logo?: string;
  category?: string;
  headquarters?: string;
  established?: string;
  i18nKey?: string;
}

export default function PlatformSelectionForm() {
  const { t } = useI18n();
  const { pushWithParams, goToPreviousStep } = useOnboardingRouting("platform-selection");

  const handlePlatformSelect = (platform: Platform) => {
    pushWithParams("/onboarding/platform-consent", { platform: platform.name });
  };

  const handleBack = () => {
    goToPreviousStep();
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto">
      <NewPlatformIntegrationContent
        onBack={handleBack}
        onPlatformSelect={handlePlatformSelect}
        backButtonText={t("onboarding.platform_selection.back_to_erp_success")}
      />
    </div>
  );
}