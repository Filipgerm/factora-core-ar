"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import AnimatedFormHeader from "@/components/AnimatedFormHeader";
import NextStepButton from "@/components/NextStepButton";
import { usePathname } from "next/navigation";
import { useOnboardingRouting } from "@/hooks/use-onboarding-routing";
import { useI18n } from "@/lib/i18n";

const COUNTRIES = [
  { flag: "🇬🇷", code: "GR" },
  { flag: "🇬🇧", code: "GB" },
  { flag: "🇩🇪", code: "DE" },
  { flag: "🇫🇷", code: "FR" },
  { flag: "🇮🇹", code: "IT" },
  { flag: "🇪🇸", code: "ES" },
  { flag: "🇳🇱", code: "NL" },
  { flag: "🇧🇪", code: "BE" },
  { flag: "🇨🇭", code: "CH" },
  { flag: "🇦🇹", code: "AT" },
  { flag: "🇸🇪", code: "SE" },
  { flag: "🇳🇴", code: "NO" },
  { flag: "🇩🇰", code: "DK" },
  { flag: "🇫🇮", code: "FI" },
  { flag: "🇵🇱", code: "PL" },
  { flag: "🇨🇿", code: "CZ" },
  { flag: "🇭🇺", code: "HU" },
  { flag: "🇷🇴", code: "RO" },
  { flag: "🇧🇬", code: "BG" },
  { flag: "🇭🇷", code: "HR" },
  { flag: "🇸🇮", code: "SI" },
  { flag: "🇸🇰", code: "SK" },
  { flag: "🇱🇹", code: "LT" },
  { flag: "🇱🇻", code: "LV" },
  { flag: "🇪🇪", code: "EE" },
  { flag: "🇨🇾", code: "CY" },
  { flag: "🇲🇹", code: "MT" },
  { flag: "🇮🇪", code: "IE" },
  { flag: "🇵🇹", code: "PT" },
  { flag: "🇱🇺", code: "LU" },
];

export default function CountrySelectorForm() {
  const { t } = useI18n();
  const pathname = usePathname();
  const currentStepId = pathname.split("/").filter(Boolean).pop() || "";
  const { goToNextStep } = useOnboardingRouting(currentStepId);
  const [selectedCountry, setSelectedCountry] = useState<
    (typeof COUNTRIES)[0] | null
  >(null);
  const [spinningFlag, setSpinningFlag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchRef.current) {
      searchRef.current.focus();
    }
  }, []);

  const countriesWithNames = COUNTRIES.map((c) => ({
    ...c,
    name: t(`onboarding.country.names.${c.code}`),
  }));

  const filteredCountries = countriesWithNames.filter((country) =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
    }, 350);
  };

  const handleCountrySelect = (country: (typeof COUNTRIES)[0]) => {
    setSelectedCountry(country);
    setSpinningFlag(country.code);
    setTimeout(() => setSpinningFlag(null), 400);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCountry) return;
    goToNextStep();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 flex-col items-center justify-center px-4 md:px-6"
    >
      <div className="w-[500px] space-y-6 md:space-y-8">
        <AnimatedFormHeader title={t("onboarding.steps.country.title")} />

        <div className="space-y-4">
          <motion.div
            className="relative w-full"
            initial={{ opacity: 0.8, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="relative w-full">
              <Input
                ref={searchRef}
                type="text"
                placeholder=""
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="h-12 w-full border-gray-300 pl-10 text-sm focus:border-brand-primary focus:ring-brand-primary md:h-14 md:text-base"
                autoComplete="off"
                autoFocus
              />
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400 md:h-5 md:w-5" />
              <motion.label
                className={`absolute left-10 cursor-text text-gray-500 transition-colors ${searchQuery || isSearchFocused ? "text-brand-primary" : ""
                  }`}
                initial={{ top: "50%", fontSize: "14px", y: "-50%" }}
                animate={{
                  top: searchQuery || isSearchFocused ? "4px" : "50%",
                  fontSize: searchQuery || isSearchFocused ? "12px" : "14px",
                  y: searchQuery || isSearchFocused ? "0" : "-50%",
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {t("onboarding.country.search_label", {
                  default: "Search countries",
                })}
              </motion.label>
            </div>
          </motion.div>
        </div>

        <input
          type="hidden"
          name="country"
          value={selectedCountry?.code ?? ""}
        />

        <div className="h-64">
          <div
            className={`overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-lg transition-all duration-600 ease-in-out [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isAnimating
              ? "max-h-64"
              : filteredCountries.length > 4
                ? "max-h-64"
                : filteredCountries.length === 1
                  ? "max-h-20"
                  : filteredCountries.length === 2
                    ? "max-h-36"
                    : filteredCountries.length === 3
                      ? "max-h-44"
                      : "max-h-52"
              }`}
          >
            <AnimatePresence mode="sync">
              {filteredCountries.map((country) => (
                <motion.div
                  key={country.code}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{
                    duration: 0.3,
                    ease: "easeInOut",
                    layout: { duration: 0.3, ease: "easeInOut" },
                  }}
                  className="mb-2 last:mb-0"
                >
                  <motion.button
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 transition-all duration-200 ${selectedCountry?.code === country.code
                      ? "border-brand-primary bg-brand-primary-subtle shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <motion.div
                      key={`${country.code}-${spinningFlag === country.code ? "spinning" : "static"
                        }`}
                      className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-gray-100 shadow-sm"
                      initial={{ rotate: 0 }}
                      animate={{
                        rotate: spinningFlag === country.code ? 360 : 0,
                      }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                    >
                      <img
                        src={`https://flagcdn.com/w80/${country.code.toLowerCase()}.png`}
                        alt={country.name}
                        className="h-full w-full object-cover"
                      />
                    </motion.div>
                    <span className="text-sm font-medium text-gray-700">
                      {country.name}
                    </span>
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <NextStepButton
            type="submit"
            className={
              selectedCountry
                ? "bg-brand-primary shadow-md hover:bg-brand-primary-hover"
                : "cursor-not-allowed bg-gray-300"
            }
            disabled={!selectedCountry}
          />
        </motion.div>
      </div>
    </form>
  );
}