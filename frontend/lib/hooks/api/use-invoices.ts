"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { apiErrorFromResponse } from "@/lib/api/error";
import {
  manualInvoiceCreateSchema,
  manualInvoiceResponseSchema,
  type ManualInvoiceCreate,
  type ManualInvoiceResponse,
} from "@/lib/schemas/invoices";
import { useAuthSession } from "@/lib/hooks/api/use-auth";

async function parseJson<T>(
  res: Response,
  schema: { parse: (data: unknown) => T }
): Promise<T> {
  const json = await res.json();
  return schema.parse(json);
}

function useHasOrg() {
  const { data: session } = useAuthSession();
  return Boolean(session?.hasToken && session.profile?.organization_id);
}

export function useManualInvoicesQuery() {
  const hasOrg = useHasOrg();
  return useQuery({
    queryKey: queryKeys.invoices.manual(),
    queryFn: async (): Promise<ManualInvoiceResponse[]> => {
      const res = await apiFetch("/v1/invoices/manual");
      if (!res.ok) throw await apiErrorFromResponse(res);
      const json: unknown = await res.json();
      return z.array(manualInvoiceResponseSchema).parse(json);
    },
    enabled: hasOrg,
  });
}

export function useCreateManualInvoiceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: ManualInvoiceCreate): Promise<ManualInvoiceResponse> => {
      const parsed = manualInvoiceCreateSchema.parse(body);
      const res = await apiFetch("/v1/invoices", {
        method: "POST",
        body: JSON.stringify({
          customer_name: parsed.customer_name,
          amount: parsed.amount,
          issue_date: parsed.issue_date,
          currency: parsed.currency,
        }),
      });
      if (!res.ok) throw await apiErrorFromResponse(res);
      return parseJson(res, manualInvoiceResponseSchema);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.invoices.manual() });
    },
  });
}
