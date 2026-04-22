"use client";

import { useMemo } from "react";

import { useCounterpartiesQuery } from "@/lib/hooks/api/use-organization";
import {
  counterpartyToArCustomer,
  isCustomerType,
} from "@/lib/organization/counterparty-mappers";
import { enrichArCustomerRow } from "@/lib/views/ar-customer-demo-data";
import type { ArCustomer } from "@/lib/views/ar";
import type { CounterpartyResponse } from "@/lib/schemas/organization";

export function useArCustomerRoute(customerId: string | undefined): {
  isLoading: boolean;
  customer: ArCustomer | null;
  counterparty: CounterpartyResponse | null;
} {
  const { data: counterparties, isLoading } = useCounterpartiesQuery();

  return useMemo(() => {
    if (!customerId) {
      return { isLoading, customer: null, counterparty: null };
    }
    const raw = (counterparties ?? []).find(
      (c) => c.id === customerId && isCustomerType(c.type)
    );
    if (!raw) {
      return { isLoading, customer: null, counterparty: null };
    }
    const customer = enrichArCustomerRow(counterpartyToArCustomer(raw));
    return { isLoading, customer, counterparty: raw };
  }, [counterparties, isLoading, customerId]);
}
