"use client";

import * as React from "react";
import { ServiceConnectionPlaceholder } from "./service-connection-placeholder";

interface ConnectedServices {
  bank: boolean;
  erp: boolean;
  bankName?: string;
  erpName?: string;
}

interface VisibleWhenCustomerProps {
  children: React.ReactNode;
  requires?: ReadonlyArray<"erp" | "bank">;
  connectedServices: ConnectedServices;
  placeholder?: React.ReactNode;
}

export function VisibleWhenCustomer({
  children,
  requires = [],
  connectedServices,
  placeholder,
}: VisibleWhenCustomerProps) {
  const hasRequiredServices = requires.every((service) => {
    if (service === "bank") return connectedServices.bank;
    if (service === "erp") return connectedServices.erp;
    return false;
  });

  if (!hasRequiredServices) {
    if (placeholder) {
      return <>{placeholder}</>;
    }

    // Determine which services are missing
    const missingServices = requires.filter((service) => {
      if (service === "bank") return !connectedServices.bank;
      if (service === "erp") return !connectedServices.erp;
      return false;
    });

    return <ServiceConnectionPlaceholder missingServices={missingServices} />;
  }

  return <>{children}</>;
}
