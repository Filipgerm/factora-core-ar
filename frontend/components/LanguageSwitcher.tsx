"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import Image from "next/image";

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="flex gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setLocale("en")}
        className="flex items-center gap-1.5 px-2.5 py-1 text-sm transition-colors duration-200 hover:bg-gray-100"
        aria-pressed={locale === "en"}
      >
        <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/5">
          <Image
            src="/images/flags/gb-circle.png"
            alt="English"
            width={24}
            height={24}
            className="h-6 w-6 object-cover"
          />
        </span>
        {t("language.english")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setLocale("el")}
        className="flex items-center gap-1.5 px-2.5 py-1 text-sm transition-colors duration-200 hover:bg-gray-100"
        aria-pressed={locale === "el"}
      >
        <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/5">
          <Image
            src="/images/flags/gr-circle.png"
            alt="Greek"
            width={24}
            height={24}
            className="h-6 w-6 object-cover"
          />
        </span>
        {t("language.greek")}
      </Button>
    </div>
  );
}
