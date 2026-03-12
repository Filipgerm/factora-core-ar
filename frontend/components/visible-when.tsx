"use client";

import * as React from "react";
import { useConnectionGates } from "@/lib/integrations";

interface ConnectedServices {
  bank: boolean;
  erp: boolean;
  ecommerce?: boolean;
  bankName?: string;
  erpName?: string;
  ecommerceName?: string;
}

interface VisibleWhenProps {
  children: React.ReactNode;
  requires?: ReadonlyArray<"erp" | "bank" | "tbd">;
  placeholder?: React.ReactNode;
  connectedServices?: ConnectedServices;
}

export function VisibleWhen({
  children,
  requires = [],
  placeholder = "—",
  connectedServices,
}: VisibleWhenProps) {
  const { hasERP, hasBank, hasTBD } = useConnectionGates();

  // If connectedServices is provided, use it instead of localStorage
  const ok = requires.every((r) => {
    if (connectedServices) {
      if (r === "erp") return connectedServices.erp;
      if (r === "bank") return connectedServices.bank;
      return false; // tbd not supported in connectedServices
    }
    // Fall back to localStorage
    return r === "erp" ? hasERP : r === "bank" ? hasBank : hasTBD;
  });

  if (!ok) return <>{placeholder}</>;
  return <>{children}</>;
}
