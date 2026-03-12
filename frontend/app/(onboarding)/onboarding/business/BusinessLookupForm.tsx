"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import AnimatedFormHeader from "@/components/AnimatedFormHeader";
import NextStepButton from "@/components/NextStepButton";
import { usePathname, useSearchParams } from "next/navigation";
import { useOnboardingRouting } from "@/hooks/use-onboarding-routing";
import { useI18n } from "@/lib/i18n";
import { ONBOARDING_DEMO_CONFIG, simulateTyping, delay } from "../demo-config";

type SearchMethod = "vat" | "gemi";

type BusinessResult = {
  name: string;
  gemiNumber: string;
  euid: string;
  distinctiveTitle: string | null;
  latinName: string | null;
  afm: string;
  incorporationDate: string;
  legalForm: string;
  status: "active" | "inactive";
  address: string;
  website: string | null;
  eshop: string | null;
};

const VAT_PLACEHOLDER = "999999999";
const VAT_SAMPLE_VALUE = "999999999";
const GEMI_PLACEHOLDER = "12345678901234";

export default function BusinessLookupForm() {
  const { t } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentStepId = pathname.split("/").filter(Boolean).pop() || "";
  const { goToNextStep } = useOnboardingRouting(currentStepId);

  const [searchMethod, setSearchMethod] = useState<SearchMethod>("vat");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BusinessResult | null>(null);
  const [selected, setSelected] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [lastSearchedKey, setLastSearchedKey] = useState<string | null>(null);

  // Demo mode detection
  const isDemoMode = searchParams.get("demo") === "true";

  // Auto-focus search input on mount
  useEffect(() => {
    if (searchRef.current && !isDemoMode) {
      searchRef.current.focus();
    }
  }, [isDemoMode]);

  // Demo simulation
  useEffect(() => {
    if (!isDemoMode) return;

    const runDemo = async () => {
      // Wait a bit before starting
      await delay(1000);

      // Simulate typing VAT number
      await simulateTyping(
        setSearchQuery,
        ONBOARDING_DEMO_CONFIG.demoData.business.vatNumber
      );

      // Wait for search to complete and result to appear
      await delay(2000);

      // Simulate user pausing to read the result
      await delay(1000);

      // Simulate clicking on the business result (selecting the company)
      setIsClicking(true);
      await delay(200); // Brief click animation
      setSelected(true);
      setIsClicking(false);

      // Wait before moving to next step
      await delay(ONBOARDING_DEMO_CONFIG.delayBeforeNextStep);
    };

    runDemo();
  }, [isDemoMode]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setResult(null);
    setSelected(false);
  };

  const isSearchValid = searchQuery.length >= 3;

  // Extracted simulated search logic so it can be reused by submit and debounce
  const simulateSearch = useCallback(() => {
    if (!isSearchValid || isLoading) return;
    const currentKey = `${searchMethod}:${searchQuery.trim()}`;
    if (lastSearchedKey === currentKey) return;
    setLastSearchedKey(currentKey);
    setIsLoading(true);
    setResult(null);
    setSelected(false);
    setTimeout(() => {
      // ACME Corporation S.A. data matching demo pages
      setResult({
        name: "ACME Corporation S.A.",
        gemiNumber: GEMI_PLACEHOLDER,
        euid: `ELGEMI.${GEMI_PLACEHOLDER}`,
        distinctiveTitle: "ACME Corp",
        latinName: "ACME Corporation S.A.",
        afm: VAT_SAMPLE_VALUE,
        incorporationDate: "15/03/2010",
        legalForm: "ΑΕ",
        status: "active",
        address: "123 Business Street, Athens, 10431",
        website: "www.acmecorp.gr",
        eshop: "shop.acmecorp.gr",
      });
      setIsLoading(false);
    }, 700);
  }, [isLoading, isSearchValid, lastSearchedKey, searchMethod, searchQuery]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selected) {
      goToNextStep();
      return;
    }

    if (!isSearchValid || isLoading) return;
    simulateSearch();
  };

  // Debounce: automatically simulate search after typing stops
  useEffect(() => {
    if (!isSearchValid || isLoading || selected) return;
    const currentKey = `${searchMethod}:${searchQuery.trim()}`;
    if (lastSearchedKey === currentKey) return;
    const debounceDelayMs = 300; // small delay before triggering search
    const id = setTimeout(() => {
      simulateSearch();
    }, debounceDelayMs);
    return () => clearTimeout(id);
  }, [
    searchQuery,
    searchMethod,
    isSearchValid,
    isLoading,
    selected,
    simulateSearch,
    lastSearchedKey,
  ]);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col items-center justify-center px-4 md:px-6"
    >
      <div className="w-[500px] space-y-6 md:space-y-8">
        {/* Header with Back Button and Title */}
        <AnimatedFormHeader title={t("onboarding.business.header")} />

        {/* Search Method Tabs */}
        <div className="space-y-4">
          <motion.div
            className="flex rounded-lg border border-gray-300 bg-gray-100 p-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <button
              type="button"
              className={`flex-1 rounded-md p-2 text-sm transition-all duration-200 md:text-base ${searchMethod === "vat"
                ? "bg-white text-gray-900 shadow-sm hover:bg-gray-50"
                : "text-gray-600 hover:bg-gray-200"
                }`}
              onClick={() => setSearchMethod("vat")}
            >
              {t("onboarding.business.tab_vat")}
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md p-2 text-sm transition-all duration-200 md:text-base ${searchMethod === "gemi"
                ? "bg-white text-gray-900 shadow-sm hover:bg-gray-50"
                : "text-gray-600 hover:bg-gray-200"
                }`}
              onClick={() => setSearchMethod("gemi")}
            >
              {t("onboarding.business.tab_gemi")}
            </button>
          </motion.div>

          {/* Search Input */}
          <div className="space-y-4">
            <motion.div
              className="relative w-full"
              key={searchMethod}
              initial={{ opacity: 0.8, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <Input
                ref={searchRef}
                type="text"
                placeholder={
                  searchMethod === "vat" ? VAT_PLACEHOLDER : GEMI_PLACEHOLDER
                }
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                // cyan-500
                className="h-12 w-full border-gray-300 pr-10 text-sm focus:border-brand-primary focus:ring-brand-primary md:h-14 md:text-base"
                required
                name="search"
                autoComplete="off"
                autoFocus
                title={
                  searchMethod === "vat"
                    ? t("onboarding.business.tab_vat")
                    : t("onboarding.business.tab_gemi")
                }
                minLength={3}
                maxLength={20}
              />
              <Search className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400 md:h-5 md:w-5" />
              <AnimatePresence mode="wait">
                <motion.label
                  key={searchMethod}
                  className={`absolute left-3 cursor-text text-gray-500 transition-colors ${searchQuery || isSearchFocused ? "text-brand-primary" : "" // cyan-500
                    }`}
                  initial={{
                    top: "50%",
                    fontSize: "14px",
                    y: "-50%",
                    opacity: 0,
                    x: searchMethod === "vat" ? -20 : 20,
                  }}
                  animate={{
                    top: searchQuery || isSearchFocused ? "4px" : "50%",
                    fontSize: searchQuery || isSearchFocused ? "12px" : "14px",
                    y: searchQuery || isSearchFocused ? "0" : "-50%",
                    opacity: 1,
                    x: 0,
                  }}
                  exit={{
                    opacity: 0,
                    x: searchMethod === "vat" ? 20 : -20,
                  }}
                  transition={{
                    duration: 0.3,
                    ease: "easeInOut",
                  }}
                >
                  {searchMethod === "vat"
                    ? t("onboarding.business.tab_vat")
                    : t("onboarding.business.tab_gemi")}
                </motion.label>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {/* Result area */}
        <div className="min-h-[7rem]">
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 shadow"
              >
                <div className="mb-2 h-5 w-40 rounded bg-gray-200" />
                <div className="mb-2 h-4 w-64 rounded bg-gray-200" />
                <div className="h-4 w-52 rounded bg-gray-200" />
              </motion.div>
            )}
            {!isLoading && result && (
              <motion.button
                key="result"
                type="button"
                onClick={() => setSelected((prev) => !prev)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                // cyan-500 and cyan-50, cyan-400 and cyan-25
                className={`flex w-full flex-col gap-3 rounded-xl border p-4 text-left shadow transition-all duration-200 ${selected
                  ? "border-brand-primary bg-brand-primary-subtle shadow-md"
                  : isClicking
                    ? "border-brand-primary-border bg-brand-primary-subtle shadow-lg scale-[0.98]"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-800">
                      {result.name}
                    </div>
                    {result.distinctiveTitle && (
                      <div className="text-xs text-gray-600">
                        {t("onboarding.business.distinctive_title")}:{" "}
                        {result.distinctiveTitle}
                      </div>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${result.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-700"
                      }`}
                  >
                    {result.status === "active"
                      ? t("onboarding.business.status_active")
                      : t("onboarding.business.status_inactive")}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-1 text-sm text-gray-700 md:grid-cols-2">
                  <div>
                    <span className="font-medium">
                      {t("onboarding.business.gemi_number")}:
                    </span>{" "}
                    {result.gemiNumber}
                  </div>
                  <div>
                    <span className="font-medium">EUID:</span> {result.euid}
                  </div>
                  <div>
                    <span className="font-medium">
                      {t("onboarding.business.vat_number")}:
                    </span>{" "}
                    {result.afm}
                  </div>
                  <div>
                    <span className="font-medium">
                      {t("onboarding.business.legal_form")}:
                    </span>{" "}
                    {result.legalForm}
                  </div>
                  <div>
                    <span className="font-medium">
                      {t("onboarding.business.incorporation_date")}:
                    </span>{" "}
                    {result.incorporationDate}
                  </div>
                  <div className="truncate">
                    <span className="font-medium">
                      {t("onboarding.business.address")}:
                    </span>{" "}
                    {result.address}
                  </div>
                  {result.website && (
                    <div className="truncate">
                      <span className="font-medium">
                        {t("onboarding.business.website")}:
                      </span>{" "}
                      <a
                        href={`https://${result.website.replace(
                          /^https?:\/\//,
                          ""
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        // cyan-700
                        className="text-brand-primary underline underline-offset-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {result.website}
                      </a>
                    </div>
                  )}
                  {result.eshop ? (
                    <div className="truncate">
                      <span className="font-medium">
                        {t("onboarding.business.eshop")}:
                      </span>{" "}
                      {result.eshop}
                    </div>
                  ) : (
                    <div>
                      <span className="font-medium">
                        {t("onboarding.business.eshop")}:
                      </span>{" "}
                      {t("onboarding.business.not_found")}
                    </div>
                  )}
                </div>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Next Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <NextStepButton
            type="submit"
            className={selected ? "" : "bg-gray-300"}
          />
        </motion.div>
      </div>
    </form>
  );
}
