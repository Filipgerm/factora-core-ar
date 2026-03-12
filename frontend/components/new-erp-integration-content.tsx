"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChartAnimation } from "@/hooks/use-chart-animations";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { DynamicBrandLogo } from "@/components/DynamicBrandLogo";

export interface ERP {
  id: string;
  name: string;
  fullName: string;
  description: string;
  logo: string;
  category?: string;
  headquarters?: string;
  established?: string;
  i18nKey?: string;
}

// ... (Keep the erps array EXACTLY as is) ...
const erps: ERP[] = [
  //
  {
    id: "mydata",
    i18nKey: "mydata",
    name: "myDATA",
    fullName: "AADE myDATA",
    description: "Digital accounting and tax reporting system...",
    logo: "/images/erps/mydata.png",
    category: "Greek Accounting System",
    headquarters: "Athens, Greece",
    established: "2017",
  },
  {
    id: "entersoftone",
    i18nKey: "entersoftone",
    name: "ENTERSOFTONE",
    fullName: "ENTERSOFTONE",
    description: "Leading Greek ERP solution provider...",
    logo: "/images/erps/entersoft.png",
    category: "Greek ERP",
    headquarters: "Athens, Greece",
    established: "2025",
  },
  {
    id: "epsilon-smart",
    i18nKey: "epsilon-smart",
    name: "Epsilon Smart",
    fullName: "Epsilon Smart",
    description: "Greek business software provider...",
    logo: "/images/erps/epsilon-smart.svg",
    category: "Greek ERP",
    headquarters: "Athens, Greece",
    established: "1999",
  },
  {
    id: "semantic",
    i18nKey: "semantic",
    name: "Semantic",
    fullName: "Semantic",
    description: "Greek ERP provider specializing in...",
    logo: "/images/erps/semantic.png",
    category: "Greek ERP",
    headquarters: "Athens, Greece",
    established: "1997",
  },
  {
    id: "quickbooks",
    i18nKey: "quickbooks",
    name: "QuickBooks",
    fullName: "Intuit QuickBooks",
    description: "Popular accounting software for small businesses...",
    logo: "/images/erps/qb.png",
    category: "Accounting Software",
    headquarters: "Mountain View, California",
    established: "1983",
  },
  {
    id: "xero",
    i18nKey: "xero",
    name: "Xero",
    fullName: "Xero Accounting",
    description: "Cloud-based accounting platform designed...",
    logo: "/images/erps/xero.svg",
    category: "Cloud Accounting",
    headquarters: "Wellington, New Zealand",
    established: "2006",
  },
  {
    id: "sage",
    i18nKey: "sage",
    name: "Sage",
    fullName: "Sage Business Cloud",
    description: "Business management software provider offering...",
    logo: "/images/erps/sage.svg",
    category: "Business Management",
    headquarters: "Newcastle, England",
    established: "1981",
  },
  {
    id: "sap",
    i18nKey: "sap",
    name: "SAP",
    fullName: "SAP SE",
    description: "Global enterprise software leader providing...",
    logo: "/images/erps/sap.png",
    category: "Enterprise ERP",
    headquarters: "Weinheim, Germany",
    established: "1972",
  },
  {
    id: "oracle",
    i18nKey: "oracle",
    name: "Oracle",
    fullName: "Oracle NetSuite",
    description: "Leading provider of enterprise cloud applications...",
    logo: "/images/erps/oracle.png",
    category: "Enterprise ERP",
    headquarters: "Austin, Texas",
    established: "1998",
  },
  {
    id: "microsoft-dynamics",
    i18nKey: "microsoft-dynamics",
    name: "Microsoft Dynamics",
    fullName: "Microsoft Dynamics 365",
    description: "Comprehensive suite of cloud-based business applications...",
    logo: "/images/erps/dynamics.png",
    category: "Cloud ERP",
    headquarters: "Redmond, Washington",
    established: "2016",
  },
];

type LocalizedERP = ERP & {
  displayName: string;
  displayFullName: string;
  displayDescription: string;
  displayCategory: string;
  displayHeadquarters: string;
};

interface NewERPIntegrationContentProps {
  onBack?: () => void;
  onERPSelect?: (erp: ERP) => void;
  backButtonText?: string;
  variant?: "onboarding" | "dashboard";
}

export function NewERPIntegrationContent({
  onBack,
  onERPSelect,
  backButtonText,
  variant = "onboarding", // DEFAULT
}: NewERPIntegrationContentProps) {
  const { t } = useI18n();
  const { containerRef, animateOnMount, addHoverEffects } = useChartAnimation();
  const [searchTerm, setSearchTerm] = useState("");
  const infoItemKeys = useMemo(
    () => ["automation", "realtime", "manual", "unified"] as const,
    []
  );

  // ... (Keep translation logic) ...
  const translateOrFallback = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  const localizedERPs = useMemo<LocalizedERP[]>(() => {
    return erps.map((erp) => {
      const baseKey = `onboarding.erp_selection.erps.${erp.i18nKey ?? erp.id}`;
      const displayName = translateOrFallback(`${baseKey}.name`, erp.name);
      const displayFullName = translateOrFallback(`${baseKey}.fullName`, erp.fullName);
      const displayDescription = translateOrFallback(`${baseKey}.description`, erp.description);
      const displayCategory = translateOrFallback(`${baseKey}.category`, erp.category ?? "");
      const displayHeadquarters = translateOrFallback(`${baseKey}.headquarters`, erp.headquarters ?? "");
      return {
        ...erp,
        displayName,
        displayFullName,
        displayDescription,
        displayCategory,
        displayHeadquarters,
      };
    });
  }, [translateOrFallback]);

  const [filteredERPs, setFilteredERPs] = useState<LocalizedERP[]>(localizedERPs);
  const cardsAnimatedRef = useRef(false);

  const resolvedBackLabel = backButtonText || t("onboarding.erp_selection.default_back");

  useEffect(() => {
    if (variant === "onboarding") {
      animateOnMount(".erp-header", { delay: 0.05 });
      animateOnMount(".erp-subtitle", { delay: 0.1 });
    }
    animateOnMount(".erp-search", { delay: 0.15 });
  }, [animateOnMount, variant]);

  useEffect(() => {
    if (cardsAnimatedRef.current) return;
    if (!filteredERPs.length) return;
    animateOnMount(".erp-card", { delay: 0.2, stagger: 0.1 });
    cardsAnimatedRef.current = true;
  }, [filteredERPs, animateOnMount]);

  useEffect(() => {
    addHoverEffects(".erp-card", 1.02);
  }, [addHoverEffects]);

  useEffect(() => {
    const normalizedSearch = searchTerm.toLowerCase();
    const filtered = localizedERPs.filter(
      (erp) =>
        erp.displayName.toLowerCase().includes(normalizedSearch) ||
        erp.displayFullName.toLowerCase().includes(normalizedSearch) ||
        erp.displayCategory.toLowerCase().includes(normalizedSearch) ||
        erp.displayDescription.toLowerCase().includes(normalizedSearch)
    );
    setFilteredERPs(filtered);
  }, [localizedERPs, searchTerm]);

  const handleERPConnect = (erp: ERP) => {
    if (onERPSelect) {
      onERPSelect(erp);
      return;
    }

    if (erp.id === "mydata") {
      window.location.href = "/onboarding/redirect";
      return;
    }
  };

  return (
    <div className="w-full h-full flex flex-col" ref={containerRef}>
      {/* Header Section - ONLY RENDER IF ONBOARDING */}
      {variant === "onboarding" && (
        <div className="flex-shrink-0 bg-brand-surface pt-4 pb-6 px-6 shadow-md z-50 relative">
          <div className="flex justify-between items-center mb-4">

            <div className="flex-1 flex justify-start">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="group flex items-center gap-3 transition-all"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-700 bg-slate-800 text-slate-300 shadow-sm transition-colors group-hover:border-brand-primary group-hover:text-brand-primary">
                    <ArrowLeft className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-300 transition-colors hidden sm:block group-hover:text-white">
                    {resolvedBackLabel}
                  </span>
                </button>
              )}
            </div>

            <DynamicBrandLogo className="relative w-40 h-16 md:w-48 flex-shrink-0" />

            {/* Right: Language Switcher */}
            <div className="flex-1 flex justify-end text-white">
              <LanguageSwitcher />
            </div>
          </div>

          {/* Title & Description */}
          <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
              {t("onboarding.erp_selection.header")}
            </h1>
            <p className="text-slate-300 text-sm max-w-xl mx-auto">
              {t("onboarding.erp_selection.subtitle")}
            </p>
          </div>

          {/* Embedded the horizontal stepper below the title block */}
          <div className="max-w-3xl mx-auto mt-8 hidden sm:block w-full">
            <OnboardingStepper variant="horizontal" theme="dark" />
          </div>
        </div>
      )}

      {/* Main Content - Adjust padding based on variant */}
      <div className={variant === "onboarding" ? "p-6" : "p-0"}>
        <div className="max-w-7xl mx-auto">
          {/* Search Bar */}
          <div className="erp-search mb-8">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder={t("onboarding.erp_selection.search_placeholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-card text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
            </div>
          </div>

          {/* ERPs Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredERPs.map((erp) => (
              <div
                key={erp.id}
                className="erp-card border border-border rounded-lg p-6 bg-card hover:shadow-lg transition-all duration-300 cursor-pointer h-[280px]"
                onClick={() => handleERPConnect(erp)}
              >
                <div className="flex flex-col h-full">
                  <div className="flex-shrink-0 mb-4 flex justify-center">
                    <div className="w-[120px] h-[60px] flex items-center justify-center relative">
                      <Image
                        src={erp.logo}
                        alt={`${erp.displayName} logo`}
                        fill
                        sizes="120px"
                        className="object-contain"
                      />
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-start mb-6">
                    <h3 className="text-lg font-bold text-card-foreground mb-2 text-center">
                      {erp.displayFullName}
                    </h3>
                    {erp.established && (
                      <div className="flex justify-between text-xs text-muted-foreground mt-auto">
                        <span>
                          {t("onboarding.erp_selection.established_label", {
                            year: erp.established,
                          })}
                        </span>
                        <span>{erp.displayHeadquarters}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 w-full">
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleERPConnect(erp);
                      }}
                    >
                      {t("onboarding.erp_selection.connect_button")}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredERPs.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                {t("onboarding.erp_selection.empty_state.title")}
              </h3>
              <p className="text-muted-foreground">
                {t("onboarding.erp_selection.empty_state.description")}
              </p>
            </div>
          )}

          {/* Additional Info - ONLY RENDER IF ONBOARDING */}
          {variant === "onboarding" && (
            <div className="mt-8 p-6 bg-muted/50 rounded-lg">
              <h3 className="text-lg font-semibold text-card-foreground mb-3">
                {t("onboarding.erp_selection.info_title")}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {infoItemKeys.map((key) => (
                  <div key={key} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-muted-foreground">
                      <strong>
                        {t(`onboarding.erp_selection.info_items.${key}.title`)}:
                      </strong>{" "}
                      {t(
                        `onboarding.erp_selection.info_items.${key}.description`
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}