"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChartAnimation } from "@/hooks/use-chart-animations";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import LanguageSwitcher from "@/components/LanguageSwitcher";

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

const platforms: Platform[] = [
  {
    id: "woocommerce",
    i18nKey: "woocommerce",
    name: "WooCommerce",
    fullName: "WooCommerce",
    description:
      "Open-source e-commerce plugin for WordPress, enabling businesses to create and manage online stores with extensive customization options and a vast ecosystem of extensions.",
    logo: "/images/platforms/woo-commerce-logo.png",
    category: "E-commerce Platform",
    headquarters: "San Francisco, California",
    established: "2011",
  },
  {
    id: "shopify",
    i18nKey: "shopify",
    name: "Shopify",
    fullName: "Shopify Inc.",
    description:
      "Leading cloud-based e-commerce platform that allows businesses to create online stores, manage products, process payments, and handle shipping with ease.",
    logo: "/images/platforms/shopify-logo.png",
    category: "E-commerce Platform",
    headquarters: "Ottawa, Canada",
    established: "2006",
  },
  {
    id: "magento",
    i18nKey: "magento",
    name: "Magento",
    fullName: "Adobe Commerce (Magento)",
    description:
      "Powerful open-source e-commerce platform offering flexibility and scalability for businesses of all sizes, with robust features for B2B and B2C commerce.",
    logo: "/images/platforms/magento-logo.png",
    category: "E-commerce Platform",
    headquarters: "Culver City, California",
    established: "2008",
  },
  {
    id: "skroutz",
    i18nKey: "skroutz",
    name: "Skroutz",
    fullName: "Skroutz S.A.",
    description:
      "Leading Greek e-commerce marketplace and price comparison platform, connecting millions of products with consumers and enabling businesses to reach a wide customer base across Greece.",
    logo: "/images/platforms/skroutz-logo.png",
    category: "E-commerce Platform",
    headquarters: "Athens, Greece",
    established: "2005",
  },
  {
    id: "ebay",
    i18nKey: "ebay",
    name: "eBay",
    fullName: "eBay Inc.",
    description:
      "Global online marketplace connecting buyers and sellers worldwide, offering a diverse range of products from electronics to collectibles with auction and fixed-price formats.",
    logo: "/images/platforms/ebay-logo.svg",
    category: "E-commerce Platform",
    headquarters: "San Jose, California",
    established: "1995",
  },
  {
    id: "amazon",
    i18nKey: "amazon",
    name: "Amazon",
    fullName: "Amazon.com, Inc.",
    description:
      "World's largest e-commerce marketplace and cloud computing company, providing sellers with access to millions of customers and comprehensive fulfillment services including Prime shipping.",
    logo: "/images/platforms/amazon-logo.png",
    category: "E-commerce Platform",
    headquarters: "Seattle, Washington",
    established: "1994",
  },
  {
    id: "etsy",
    i18nKey: "etsy",
    name: "Etsy",
    fullName: "Etsy, Inc.",
    description:
      "Global online marketplace specializing in handmade, vintage, and unique products, connecting creative sellers with buyers seeking one-of-a-kind items and personalized goods.",
    logo: "/images/platforms/etsy-logo.png",
    category: "E-commerce Platform",
    headquarters: "Brooklyn, New York",
    established: "2005",
  },
  {
    id: "other",
    i18nKey: "other",
    name: "Other",
    fullName: "Other Platform",
    description:
      "Connect your custom e-commerce platform or a platform not listed above. You'll be able to configure the connection using API credentials or OAuth 2.0 authentication.",
    category: "Custom Platform",
  },
];

type LocalizedPlatform = Platform & {
  displayName: string;
  displayFullName: string;
  displayDescription: string;
  displayCategory: string;
  displayHeadquarters: string;
};

interface NewPlatformIntegrationContentProps {
  onBack?: () => void;
  onPlatformSelect?: (platform: Platform) => void;
  backButtonText?: string;
}

export function NewPlatformIntegrationContent({
  onBack,
  onPlatformSelect,
  backButtonText,
}: NewPlatformIntegrationContentProps) {
  const { t } = useI18n();
  const { containerRef, animateOnMount, addHoverEffects } = useChartAnimation();
  const [searchTerm, setSearchTerm] = useState("");
  const infoItemKeys = useMemo(
    () => ["orders", "customers", "realtime", "analytics"] as const,
    []
  );

  const translateOrFallback = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  const localizedPlatforms = useMemo<LocalizedPlatform[]>(() => {
    return platforms.map((platform) => {
      const baseKey = `onboarding.platform_selection.platforms.${platform.i18nKey ?? platform.id
        }`;
      const displayName = translateOrFallback(`${baseKey}.name`, platform.name);
      const displayFullName = translateOrFallback(
        `${baseKey}.fullName`,
        platform.fullName
      );
      const displayDescription = translateOrFallback(
        `${baseKey}.description`,
        platform.description
      );
      const displayCategory = translateOrFallback(
        `${baseKey}.category`,
        platform.category ?? ""
      );
      const displayHeadquarters = translateOrFallback(
        `${baseKey}.headquarters`,
        platform.headquarters ?? ""
      );
      return {
        ...platform,
        displayName,
        displayFullName,
        displayDescription,
        displayCategory,
        displayHeadquarters,
      };
    });
  }, [translateOrFallback]);

  const [filteredPlatforms, setFilteredPlatforms] =
    useState<LocalizedPlatform[]>(localizedPlatforms);
  const cardsAnimatedRef = useRef(false);
  const resolvedBackLabel =
    backButtonText || t("onboarding.platform_selection.default_back");

  useEffect(() => {
    animateOnMount(".platform-header", { delay: 0.05 });
    animateOnMount(".platform-subtitle", { delay: 0.1 });
    animateOnMount(".platform-search", { delay: 0.15 });
  }, [animateOnMount]);

  useEffect(() => {
    if (cardsAnimatedRef.current) return;
    if (!filteredPlatforms.length) return;
    animateOnMount(".platform-card", { delay: 0.2, stagger: 0.1 });
    cardsAnimatedRef.current = true;
  }, [filteredPlatforms, animateOnMount]);

  useEffect(() => {
    addHoverEffects(".platform-card", 1.02);
  }, [addHoverEffects]);

  useEffect(() => {
    const normalizedSearch = searchTerm.toLowerCase();
    const filtered = localizedPlatforms.filter(
      (platform) =>
        platform.displayName.toLowerCase().includes(normalizedSearch) ||
        platform.displayFullName.toLowerCase().includes(normalizedSearch) ||
        platform.displayCategory.toLowerCase().includes(normalizedSearch) ||
        platform.displayDescription.toLowerCase().includes(normalizedSearch)
    );
    setFilteredPlatforms(filtered);
  }, [localizedPlatforms, searchTerm]);

  const handlePlatformConnect = (platform: Platform) => {
    if (onPlatformSelect) {
      onPlatformSelect(platform);
    }
  };

  return (
    <div className="space-y-6" ref={containerRef}>
      {/* Header Section */}
      <div className="platform-header flex-shrink-0 bg-brand-surface pt-4 pb-6 px-6 shadow-md z-50 relative text-white">
        {/* Dominant tripartite layout */}
        <div className="flex justify-between items-center mb-4 max-w-7xl mx-auto w-full">

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

          {/* Center: Kleemann Logo*/}
          <div className="relative w-40 h-16 md:w-48 flex-shrink-0">
            <Image
              src="/images/demo/kleemann-logo.png"
              alt="Brand Logo"
              fill
              className="object-contain object-center"
              priority
            />
          </div>

          {/* Right: Language Switcher */}
          <div className="flex-1 flex justify-end text-white">
            <LanguageSwitcher />
          </div>
        </div>

        {/* Title & Description */}
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
            {t("onboarding.platform_selection.header")}
          </h1>
          <p className="text-slate-300 text-sm max-w-xl mx-auto">
            {t("onboarding.platform_selection.subtitle")}
          </p>
        </div>

        {/* Embedded the horizontal stepper below the title block */}
        <div className="max-w-3xl mx-auto mt-8 hidden sm:block w-full">
          <OnboardingStepper variant="horizontal" theme="dark" />
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Search Bar */}
          <div className="platform-search mb-8">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder={t(
                  "onboarding.platform_selection.search_placeholder"
                )}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-card text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
            </div>
          </div>

          {/* Platforms Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPlatforms.map((platform) => (
              <div
                key={platform.id}
                className="platform-card border border-border rounded-lg p-6 bg-card hover:shadow-lg transition-all duration-300 cursor-pointer h-[280px]"
                onClick={() => handlePlatformConnect(platform)}
              >
                <div className="flex flex-col h-full">
                  {/* Platform Logo */}
                  {platform.logo && (
                    <div className="flex-shrink-0 mb-4 flex justify-center">
                      <div className="w-[120px] h-[60px] flex items-center justify-center relative">
                        <Image
                          src={platform.logo}
                          alt={`${platform.displayName} logo`}
                          fill
                          sizes="120px"
                          className="object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {/* Platform Info */}
                  <div className="flex-1 flex flex-col justify-start mb-6">
                    <h3 className="text-lg font-bold text-card-foreground mb-2 text-center">
                      {platform.displayFullName}
                    </h3>
                    {platform.established && (
                      <div className="flex justify-between text-xs text-muted-foreground mt-auto">
                        <span>
                          {t("onboarding.platform_selection.established_label", {
                            year: platform.established,
                          })}
                        </span>
                        <span>{platform.displayHeadquarters}</span>
                      </div>
                    )}
                  </div>

                  {/* Connect Button */}
                  <div className="flex-shrink-0 w-full">
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlatformConnect(platform);
                      }}
                    >
                      {t("onboarding.platform_selection.connect_button")}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredPlatforms.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                {t("onboarding.platform_selection.empty_state.title")}
              </h3>
              <p className="text-muted-foreground">
                {t("onboarding.platform_selection.empty_state.description")}
              </p>
            </div>
          )}

          {/* Additional Info */}
          <div className="mt-8 p-6 bg-muted/50 rounded-lg">
            <h3 className="text-lg font-semibold text-card-foreground mb-3">
              {t("onboarding.platform_selection.info_title")}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {infoItemKeys.map((key) => (
                <div key={key} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-muted-foreground">
                    <strong>
                      {t(
                        `onboarding.platform_selection.info_items.${key}.title`
                      )}
                      :
                    </strong>{" "}
                    {t(
                      `onboarding.platform_selection.info_items.${key}.description`
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
