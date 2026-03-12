"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import enMessages from "@/locales/en.json";
import elMessages from "@/locales/el.json";

type Locale = "en" | "el";

type MessageValue = string | number | MessageMap;
type MessageMap = { [key: string]: MessageValue };
type Messages = MessageMap;

type I18nContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  messages: Messages;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{\{(.*?)\}\}/g, (_, k) =>
    String(vars[k.trim()] ?? "")
  );
}

function getNested(messages: Messages, path: string) {
  return path.split(".").reduce<MessageValue | undefined>((acc, part) => {
    if (acc === undefined) return undefined;
    if (typeof acc === "object") {
      return (acc as MessageMap)[part];
    }
    return undefined;
  }, messages);
}

export function I18nProvider({
  children,
  initialLocale = "en" as Locale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Load saved locale from localStorage on mount (client-only)
  useEffect(() => {
    try {
      const saved = (
        typeof window !== "undefined"
          ? window.localStorage.getItem("locale")
          : null
      ) as Locale | null;
      if (saved === "en" || saved === "el") {
        setLocaleState(saved);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const messages: Messages = useMemo(() => {
    const data =
      locale === "el" ? (elMessages as unknown) : (enMessages as unknown);
    return data as Messages;
  }, [locale]);

  const t = useMemo(() => {
    return (key: string, vars?: Record<string, string | number>) => {
      const value = getNested(messages, key);
      if (typeof value === "string") return interpolate(value, vars);
      return key; // fallback
    };
  }, [messages]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: (next: Locale) => {
        setLocaleState(next);
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem("locale", next);
          }
        } catch {
          // ignore storage errors
        }
      },
      t,
      messages,
    }),
    [locale, t, messages]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
