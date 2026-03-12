"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronUp } from "lucide-react";
import AnimatedFormHeader from "@/components/AnimatedFormHeader";
import NextStepButton from "@/components/NextStepButton";
import { useI18n } from "@/lib/i18n";
import { useSearchParams } from "next/navigation";
import { ONBOARDING_DEMO_CONFIG, simulateTyping, delay } from "../demo-config";

const COUNTRY_CODES = [
  { flag: "🇬🇷", code: "+30" }, // GREECE
  { flag: "🇬🇧", code: "+44" }, // UNITED_KINGDOM
  { flag: "🇩🇪", code: "+49" }, // GERMANY
  { flag: "🇫🇷", code: "+33" }, // FRANCE
  { flag: "🇮🇹", code: "+39" }, // ITALY
  { flag: "🇪🇸", code: "+34" }, // SPAIN
  { flag: "🇳🇱", code: "+31" }, // NETHERLANDS
  { flag: "🇧🇪", code: "+32" }, // BELGIUM
  { flag: "🇨🇭", code: "+41" }, // SWITZERLAND
  { flag: "🇦🇹", code: "+43" }, // AUSTRIA
  { flag: "🇸🇪", code: "+46" }, // SWEDEN
  { flag: "🇳🇴", code: "+47" }, // NORWAY
  { flag: "🇩🇰", code: "+45" }, // DENMARK
  { flag: "🇫🇮", code: "+358" }, // FINLAND
  { flag: "🇵🇱", code: "+48" }, // POLAND
  { flag: "🇨🇿", code: "+420" }, // CZECH_REPUBLIC
  { flag: "🇭🇺", code: "+36" }, // HUNGARY
  { flag: "🇷🇴", code: "+40" }, // ROMANIA
  { flag: "🇧🇬", code: "+359" }, // BULGARIA
  { flag: "🇭🇷", code: "+385" }, // CROATIA
  { flag: "🇸🇮", code: "+386" }, // SLOVENIA
  { flag: "🇸🇰", code: "+421" }, // SLOVAKIA
  { flag: "🇱🇹", code: "+370" }, // LITHUANIA
  { flag: "🇱🇻", code: "+371" }, // LATVIA
  { flag: "🇪🇪", code: "+372" }, // ESTONIA
  { flag: "🇨🇾", code: "+357" }, // CYPRUS
  { flag: "🇲🇹", code: "+356" }, // MALTA
  { flag: "🇮🇪", code: "+353" }, // IRELAND
  { flag: "🇵🇹", code: "+351" }, // PORTUGAL
  { flag: "🇱🇺", code: "+352" }, // LUXEMBOURG
];

export default function PhoneForm() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [country, setCountry] = useState(COUNTRY_CODES[0]);
  const [phone, setPhone] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);

  // Demo mode detection
  const isDemoMode = searchParams.get("demo") === "true";

  // Demo simulation
  useEffect(() => {
    if (!isDemoMode) return;

    const runDemo = async () => {
      // Wait a bit before starting
      await delay(1000);

      // Simulate user clicking on dropdown to select Greece
      setIsDropdownOpen(true);
      await delay(800); // Show dropdown open
      setIsDropdownOpen(false);
      await delay(300); // Close dropdown

      // Simulate typing phone number
      await simulateTyping(
        setPhone,
        ONBOARDING_DEMO_CONFIG.demoData.phone.phoneNumber
      );

      // Wait before moving to next step
      await delay(ONBOARDING_DEMO_CONFIG.delayBeforeNextStep);
    };

    runDemo();
  }, [isDemoMode]);

  return (
    <form className="flex flex-1 flex-col items-center justify-center px-4 md:px-6">
      <div className="w-[500px] space-y-6 md:space-y-8">
        {/* Header with Back Button and Title */}
        <AnimatedFormHeader title={t("onboarding.phone.header")} />

        {/* Phone Input */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0.8, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="flex gap-2">
              {/* Country Code Dropdown */}
              <DropdownMenu
                open={isDropdownOpen}
                onOpenChange={setIsDropdownOpen}
              >
                <DropdownMenuTrigger asChild>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="outline"
                      className="flex h-12 w-[120px] items-center gap-2 border-gray-300 bg-gray-50 px-3 py-2 md:h-14 md:w-[140px] md:px-4"
                      type="button"
                    >
                      <motion.div
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm md:h-8 md:w-8"
                        animate={{ rotate: isDropdownOpen ? 360 : 0 }}
                        transition={{
                          duration: 0.4,
                          ease: "easeInOut",
                        }}
                      >
                        <span className="text-sm md:text-base">
                          {country.flag}
                        </span>
                      </motion.div>
                      <span className="text-sm font-medium text-gray-700 md:text-base">
                        {country.code}
                      </span>
                      <motion.div
                        animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {isDropdownOpen ? (
                          <ChevronUp className="h-3 w-3 text-gray-600 md:h-4 md:w-4" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-gray-600 md:h-4 md:w-4" />
                        )}
                      </motion.div>
                    </Button>
                  </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-[300px] overflow-y-auto rounded-xl border-gray-200 bg-white shadow-lg [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <AnimatePresence>
                    {COUNTRY_CODES.map((c, index) => (
                      <motion.div
                        key={c.code}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{
                          duration: 0.2,
                          delay: index * 0.02,
                          ease: "easeOut",
                        }}
                      >
                        <DropdownMenuItem
                          onSelect={() => setCountry(c)}
                          className="flex items-center gap-2 px-3 py-2"
                        >
                          <motion.div
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm"
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.1 }}
                          >
                            <span className="text-sm">{c.flag}</span>
                          </motion.div>
                          <span className="text-sm font-medium text-gray-700">
                            {c.code}
                          </span>
                        </DropdownMenuItem>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Phone Number Input */}
              <div className="relative flex-1">
                <div className="relative w-full">
                  {/* Hidden input for country code */}
                  <input
                    type="hidden"
                    name="countryCode"
                    value={country.code}
                  />
                  <Input
                    type="tel"
                    placeholder=""
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onFocus={() => setIsPhoneFocused(true)}
                    onBlur={() => setIsPhoneFocused(false)}
                    className="h-12 w-full border-gray-300 text-sm focus:border-brand-primary focus:ring-brand-primary md:h-14 md:text-base"
                    required
                    inputMode="tel"
                    pattern="[0-9]{7,15}"
                    name="phone"
                    autoComplete="tel"
                    autoFocus
                    title={t("onboarding.phone.tooltip")}
                    minLength={7}
                    maxLength={15}
                  />
                  <motion.label
                    className={`absolute left-3 cursor-text text-gray-500 transition-colors`}
                    initial={{
                      top: "50%",
                      fontSize: "14px",
                      y: "-50%",
                    }}
                    animate={{
                      top: phone || isPhoneFocused ? "4px" : "50%",
                      fontSize: phone || isPhoneFocused ? "12px" : "14px",
                      y: phone || isPhoneFocused ? "0" : "-50%",
                    }}
                    transition={{
                      duration: 0.2,
                      ease: "easeOut",
                    }}
                  >
                    {t("onboarding.phone.label")}
                  </motion.label>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        {/* Next Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <NextStepButton
            className={
              phone.length >= 7
                ? "bg-brand-primary shadow-md hover:bg-brand-primary-hover"
                : "cursor-not-allowed bg-gray-300"
            }
            disabled={phone.length < 7}
          />
        </motion.div>
      </div>
    </form>
  );
}
