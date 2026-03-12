"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChartAnimation } from "@/hooks/use-chart-animations";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";
import { DynamicBrandLogo } from "@/components/DynamicBrandLogo";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export interface Bank {
  id: string;
  name: string;
  fullName: string;
  description: string;
  logo: string;
  established?: string;
  headquarters?: string;
  i18nKey?: string;
}

export const banks: Bank[] = [
  // Greek Banks (First Row)
  {
    id: "piraeus",
    i18nKey: "piraeus",
    name: "Piraeus Bank",
    fullName: "Piraeus Bank S.A.",
    description:
      "One of Greece's leading financial institutions, offering comprehensive banking services including corporate banking, retail banking, and investment services.",
    logo: "/images/banks/piraeus-bank.png",
    established: "1916",
    headquarters: "Athens, Greece",
  },
  {
    id: "alpha",
    i18nKey: "alpha",
    name: "Alpha Bank",
    fullName: "Alpha Bank S.A.",
    description:
      "A major Greek banking group providing retail and corporate banking services, with a strong presence in Greece and Southeast Europe.",
    logo: "/images/banks/alpha-bank.jpg",
    established: "1879",
    headquarters: "Athens, Greece",
  },
  {
    id: "nbg",
    i18nKey: "nbg",
    name: "National Bank of Greece",
    fullName: "National Bank of Greece S.A.",
    description:
      "Greece's oldest and largest bank, offering a full range of financial services including commercial banking, investment banking, and insurance.",
    logo: "/images/banks/nbg-bank.png",
    established: "1841",
    headquarters: "Athens, Greece",
  },
  {
    id: "eurobank",
    i18nKey: "eurobank",
    name: "Eurobank",
    fullName: "Eurobank S.A.",
    description:
      "A leading Greek bank providing comprehensive financial services including retail banking, corporate banking, and wealth management solutions.",
    logo: "/images/banks/euro-bank.png",
    established: "1990",
    headquarters: "Athens, Greece",
  },
  // International Banks
  {
    id: "revolut",
    i18nKey: "revolut",
    name: "Revolut",
    fullName: "Revolut Ltd.",
    description:
      "A British neobank offering digital banking services, currency exchange, and financial technology solutions across Europe and beyond.",
    logo: "/images/banks/revolut-bank.svg",
    established: "2015",
    headquarters: "London, United Kingdom",
  },
  {
    id: "n26",
    i18nKey: "n26",
    name: "N26",
    fullName: "N26 Bank GmbH",
    description:
      "A German neobank offering mobile banking services across Europe with innovative digital banking solutions.",
    logo: "/images/banks/n26-bank.png",
    established: "2013",
    headquarters: "Berlin, Germany",
  },
  {
    id: "wise",
    i18nKey: "wise",
    name: "Wise",
    fullName: "Wise Payments Limited",
    description:
      "A British financial technology company specializing in international money transfers and multi-currency accounts with transparent, low-cost services.",
    logo: "/images/banks/wise-bank.svg",
    established: "2011",
    headquarters: "London, United Kingdom",
  },
  // Greek Banks
  {
    id: "credia",
    i18nKey: "credia",
    name: "Credia Bank",
    fullName: "Credia Bank S.A.",
    description:
      "A Greek cooperative bank offering comprehensive banking services to individuals and businesses.",
    logo: "/images/banks/credia-bank.png",
    established: "2015",
    headquarters: "Athens, Greece",
  },
  {
    id: "epirus",
    i18nKey: "epirus",
    name: "Epirus Bank",
    fullName: "Epirus Bank S.A.",
    description:
      "A regional Greek bank providing banking services primarily in the Epirus region.",
    logo: "/images/banks/epirus-bank.png",
    established: "1994",
    headquarters: "Ioannina, Greece",
  },
  {
    id: "optima",
    i18nKey: "optima",
    name: "Optima Bank",
    fullName: "Optima Bank S.A.",
    description:
      "A Greek bank offering modern banking solutions including digital banking services.",
    logo: "/images/banks/optima-bank.jpg",
    established: "2001",
    headquarters: "Athens, Greece",
  },
  {
    id: "viva",
    i18nKey: "viva",
    name: "Viva Bank",
    fullName: "Viva Wallet Bank",
    description:
      "A Greek neobank offering digital banking services and payment solutions for businesses and individuals.",
    logo: "/images/banks/viva-bank.png",
    established: "2000",
    headquarters: "Athens, Greece",
  },
  // International Banks
  {
    id: "ing",
    i18nKey: "ing",
    name: "ING",
    fullName: "ING Group N.V.",
    description:
      "A Dutch multinational banking and financial services corporation offering retail and commercial banking services across Europe.",
    logo: "/images/banks/ing-bank.png",
    established: "1991",
    headquarters: "Amsterdam, Netherlands",
  },

  {
    id: "bnp",
    i18nKey: "bnp",
    name: "BNP Paribas",
    fullName: "BNP Paribas S.A.",
    description:
      "A French multinational bank offering retail banking, corporate banking, and investment banking services across Europe.",
    logo: "/images/banks/bnp-paribas.png",
    established: "2000",
    headquarters: "Paris, France",
  },
  {
    id: "deutsche",
    i18nKey: "deutsche",
    name: "Deutsche Bank",
    fullName: "Deutsche Bank AG",
    description:
      "A German multinational investment bank offering corporate banking, investment banking, and retail banking services.",
    logo: "/images/banks/deutsche-bank.png",
    established: "1870",
    headquarters: "Frankfurt, Germany",
  },

  {
    id: "santander",
    i18nKey: "santander",
    name: "Santander",
    fullName: "Banco Santander S.A.",
    description:
      "A Spanish multinational commercial bank offering retail and commercial banking services across Europe and the Americas.",
    logo: "/images/banks/santander-bank.png",
    established: "1857",
    headquarters: "Madrid, Spain",
  },
  {
    id: "triodos",
    i18nKey: "triodos",
    name: "Triodos Bank",
    fullName: "Triodos Bank N.V.",
    description:
      "A Dutch sustainable bank offering banking services focused on social, environmental, and cultural development.",
    logo: "/images/banks/triodos-bank.png",
    established: "1980",
    headquarters: "Zeist, Netherlands",
  },
];

type LocalizedBank = Bank & {
  displayName: string;
  displayFullName: string;
  displayDescription: string;
  displayHeadquarters: string;
};

interface NewBankIntegrationContentProps {
  onBack?: () => void;
  onBankSelect?: (bank: Bank) => void;
  backButtonText?: string;
  variant?: "onboarding" | "dashboard";
  headerAction?: React.ReactNode;
}

export function NewBankIntegrationContent({
  onBack,
  onBankSelect,
  backButtonText,
  variant = "onboarding", // DEFAULT,
  headerAction,
}: NewBankIntegrationContentProps) {
  const { t } = useI18n();
  const { containerRef, animateOnMount, addHoverEffects } = useChartAnimation();
  const [searchTerm, setSearchTerm] = useState("");

  const infoItemKeys = useMemo(
    () => ["reconciliation", "balance", "cashflow", "security"] as const,
    []
  );

  const translateOrFallback = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  const localizedBanks = useMemo<LocalizedBank[]>(() => {
    return banks.map((bank) => {
      const baseKey = `onboarding.bank_selection.banks.${bank.i18nKey ?? bank.id
        }`;
      const displayName = translateOrFallback(`${baseKey}.name`, bank.name);
      const displayFullName = translateOrFallback(
        `${baseKey}.fullName`,
        bank.fullName
      );
      const displayDescription = translateOrFallback(
        `${baseKey}.description`,
        bank.description
      );
      const displayHeadquarters = translateOrFallback(
        `${baseKey}.headquarters`,
        bank.headquarters ?? ""
      );
      return {
        ...bank,
        displayName,
        displayFullName,
        displayDescription,
        displayHeadquarters,
      };
    });
  }, [translateOrFallback]);

  const [filteredBanks, setFilteredBanks] =
    useState<LocalizedBank[]>(localizedBanks);
  const cardsAnimatedRef = useRef(false);

  const resolvedBackLabel =
    backButtonText || t("onboarding.bank_selection.default_back");

  useEffect(() => {
    if (variant === "onboarding") {
      animateOnMount(".bank-header", { delay: 0.05 });
      animateOnMount(".bank-subtitle", { delay: 0.1 });
    }
    animateOnMount(".bank-search", { delay: 0.15 });
  }, [animateOnMount, variant]);

  useEffect(() => {
    if (cardsAnimatedRef.current) return;
    if (!filteredBanks.length) return;
    animateOnMount(".bank-card", { delay: 0.2, stagger: 0.1 });
    cardsAnimatedRef.current = true;
  }, [filteredBanks, animateOnMount]);

  useEffect(() => {
    addHoverEffects(".bank-card", 1.02);
  }, [addHoverEffects]);

  useEffect(() => {
    const normalizedSearch = searchTerm.toLowerCase();
    const filtered = localizedBanks.filter(
      (bank) =>
        bank.displayName.toLowerCase().includes(normalizedSearch) ||
        bank.displayFullName.toLowerCase().includes(normalizedSearch) ||
        bank.displayDescription.toLowerCase().includes(normalizedSearch)
    );
    setFilteredBanks(filtered);
  }, [localizedBanks, searchTerm]);

  const handleBankConnect = (bank: Bank) => {
    if (onBankSelect) {
      onBankSelect(bank);
    }
  };

  return (
    <div className="w-full h-full flex flex-col" ref={containerRef}>
      {/* Header Section - ONLY RENDER IF ONBOARDING */}
      {variant === "onboarding" && (
        <div className="flex-shrink-0 bg-brand-surface pt-4 pb-6 px-6 shadow-md z-50 relative">
          <div className="flex justify-between items-center mb-4">

            {/* Left: Back Button */}
            <div className="flex-1 flex justify-start">
              {onBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="group flex items-center gap-3 transition-all"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-700 bg-slate-800 text-slate-300 shadow-sm transition-colors group-hover:border-brand-primary group-hover:text-brand-primary">
                    <ArrowLeft className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-300 transition-colors hidden sm:block group-hover:text-white">
                    {resolvedBackLabel}
                  </span>
                </Button>
              )}
            </div>

            {/* BRAND LOGO */}
            <DynamicBrandLogo className="relative w-40 h-16 md:w-48 flex-shrink-0" />

            {/* Next Button and language switcher */}
            <div className="flex-1 flex justify-end text-white items-center gap-4">
              <div className="hidden md:block">
                <LanguageSwitcher />
              </div>
              {headerAction && (
                <div>{headerAction}</div>
              )}
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
              {t("onboarding.bank_selection.header")}
            </h1>
            <p className="text-slate-300 text-sm max-w-xl mx-auto">
              {t("onboarding.bank_selection.subtitle")}
            </p>
          </div>

          {/* Embedded the horizontal stepper below the title block */}
          <div className="max-w-3xl mx-auto mt-8 hidden sm:block w-full">
            <OnboardingStepper variant="horizontal" theme="dark" />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={variant === "onboarding" ? "p-6" : "p-0"}>
        <div className="max-w-7xl mx-auto">
          {/* Search Bar */}
          <div className="bank-search mb-8">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder={t("onboarding.bank_selection.search_placeholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-card text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
            </div>
          </div>

          {/* Banks Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBanks.map((bank) => (
              <div
                key={bank.id}
                className="bank-card border border-border rounded-lg p-6 bg-card hover:shadow-lg transition-all duration-300 cursor-pointer h-[280px]"
                onClick={() => handleBankConnect(bank)}
              >
                <div className="flex flex-col h-full">
                  {/* Bank Logo */}
                  <div className="flex-shrink-0 mb-6 flex justify-center">
                    <div className="w-[120px] h-[60px] flex items-center justify-center relative">
                      <Image
                        src={bank.logo}
                        alt={`${bank.displayName} logo`}
                        fill
                        sizes="120px"
                        className="object-contain"
                      />
                    </div>
                  </div>

                  {/* Bank Info */}
                  <div className="flex-1 flex flex-col justify-start mb-6">
                    <h3 className="text-lg font-bold text-card-foreground mb-2 text-center">
                      {bank.displayFullName}
                    </h3>
                    {bank.established && (
                      <div className="flex justify-between text-xs text-muted-foreground mt-auto">
                        <span>
                          {t("onboarding.bank_selection.established_label", {
                            year: bank.established,
                          })}
                        </span>
                        <span>{bank.displayHeadquarters}</span>
                      </div>
                    )}
                  </div>

                  {/* Connect Button */}
                  <div className="flex-shrink-0 w-full">
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBankConnect(bank);
                      }}
                    >
                      {t("onboarding.bank_selection.connect_button")}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredBanks.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                {t("onboarding.bank_selection.empty_state.title")}
              </h3>
              <p className="text-muted-foreground">
                {t("onboarding.bank_selection.empty_state.description")}
              </p>
            </div>
          )}

          {/* Additional Info */}
          {variant === "onboarding" && (
            <div className="mt-8 p-6 bg-muted/50 rounded-lg">
              <h3 className="text-lg font-semibold text-card-foreground mb-3">
                {t("onboarding.bank_selection.info_title")}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {infoItemKeys.map((key) => (
                  <div key={key} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-muted-foreground">
                      <strong>
                        {t(`onboarding.bank_selection.info_items.${key}.title`)}:
                      </strong>{" "}
                      {t(
                        `onboarding.bank_selection.info_items.${key}.description`
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div >
  );
}
