"use client";

import { ReactNode } from "react";
import { findCustomerByVat } from "@/lib/utils/customer-helpers";
import { VisibleWhenCustomer } from "@/components/visible-when-customer";
import { ErrorState } from "./error-state";
import type { Customer } from "@/lib/customers-data";

interface CustomerPageWrapperProps {
  vatNumber: string;
  requires?: ReadonlyArray<"erp" | "bank">;
  children: (customer: Customer) => ReactNode;
  errorTitle?: string;
  errorMessage?: string;
}

export function CustomerPageWrapper({
  vatNumber,
  requires,
  children,
  errorTitle = "Customer Not Found",
  errorMessage,
}: CustomerPageWrapperProps) {
  const customer = findCustomerByVat(vatNumber);

  if (!customer) {
    return (
      <ErrorState
        title={errorTitle}
        message={
          errorMessage ||
          `The customer with VAT number "${vatNumber}" could not be found.`
        }
      />
    );
  }

  if (requires && requires.length > 0) {
    return (
      <VisibleWhenCustomer
        requires={requires}
        connectedServices={customer.connectedServices}
      >
        {children(customer)}
      </VisibleWhenCustomer>
    );
  }

  return <>{children(customer)}</>;
}
