"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

type PrivacyContextValue = {
  isDiscreet: boolean;
  setDiscreet: (value: boolean) => void;
  toggleDiscreet: () => void;
};

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [isDiscreet, setIsDiscreet] = useState(false);

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? localStorage.getItem("discreetMode")
        : null;
    if (stored != null) {
      setIsDiscreet(stored === "1");
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.toggle("discreet", isDiscreet);
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("discreetMode", isDiscreet ? "1" : "0");
    }
  }, [isDiscreet]);

  const value = useMemo<PrivacyContextValue>(
    () => ({
      isDiscreet,
      setDiscreet: setIsDiscreet,
      toggleDiscreet: () => setIsDiscreet((v) => !v),
    }),
    [isDiscreet]
  );

  return (
    <PrivacyContext.Provider value={value}>
      {children}
      {/* Floating toggle button */}
      <div
        className="hidden"
        style={{ position: "fixed", right: 16, bottom: 16, zIndex: 1000 }}
      >
        <Button
          variant="secondary"
          size="icon"
          aria-label={
            isDiscreet ? "Disable discreet mode" : "Enable discreet mode"
          }
          onClick={() => setIsDiscreet((v) => !v)}
        >
          {isDiscreet ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
      </div>
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) {
    throw new Error("usePrivacy must be used within a PrivacyProvider");
  }
  return ctx;
}
