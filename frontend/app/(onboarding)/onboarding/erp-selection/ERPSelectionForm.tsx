"use client";

import { useSearchParams } from "next/navigation";
import { NewERPIntegrationContent } from "@/components/new-erp-integration-content";
import { useI18n } from "@/lib/i18n";
import { useOnboardingRouting } from "@/hooks/use-onboarding-routing";

interface ERP {
  id: string;
  name: string;
  fullName: string;
  description: string;
  logo: string;
  category?: string;
  headquarters?: string;
}

export default function ERPSelectionForm() {
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { pushWithParams } = useOnboardingRouting("erp-selection");

  const handleERPSelect = (erp: ERP) => {
    // Preserve all params (exclude, demo, etc.), add/override as needed
    const baseParams = new URLSearchParams(searchParams.toString());
    baseParams.set("source", "onboarding");

    if (erp.id === "mydata") {
      pushWithParams("/onboarding/redirect", Object.fromEntries(baseParams));
      return;
    }

    baseParams.set("erp", erp.name);
    pushWithParams("/onboarding/erp-consent", Object.fromEntries(baseParams));
  };

  const handleBack = () => {
    pushWithParams("/onboarding/bank-success");
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto">
      <NewERPIntegrationContent
        onBack={handleBack}
        onERPSelect={handleERPSelect}
        backButtonText={t("onboarding.erp_selection.back_to_bank_success")}
      />
    </div>
  );
}
