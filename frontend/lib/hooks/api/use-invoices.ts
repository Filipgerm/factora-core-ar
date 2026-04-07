"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { apiErrorFromResponse } from "@/lib/api/error";
import {
  invoiceCreateSchema,
  invoiceResponseSchema,
  type InvoiceCreate,
  type InvoiceResponse,
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

export function useInvoicesQuery(options?: { source?: string }) {
  const hasOrg = useHasOrg();
  const source = options?.source;
  return useQuery({
    queryKey: queryKeys.invoices.list({ source }),
    queryFn: async (): Promise<InvoiceResponse[]> => {
      const sp = new URLSearchParams();
      if (source) sp.set("source", source);
      const q = sp.toString();
      const path = q ? `/v1/invoices?${q}` : "/v1/invoices";
      const res = await apiFetch(path);
      if (!res.ok) throw await apiErrorFromResponse(res);
      const json: unknown = await res.json();
      return z.array(invoiceResponseSchema).parse(json);
    },
    enabled: hasOrg,
  });
}

/** Manual + other unified rows; prefer filtering with ``{ source: \"manual\" }`` when needed. */
export function useManualInvoicesQuery() {
  return useInvoicesQuery({ source: "manual" });
}

/** All unified invoice sources (manual, Gmail, OCR, CSV) for AR list — not AADE-only. */
export function useUnifiedInvoicesForArQuery() {
  return useInvoicesQuery();
}

export function useCreateInvoiceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: InvoiceCreate): Promise<InvoiceResponse> => {
      const parsed = invoiceCreateSchema.parse(body);
      const res = await apiFetch("/v1/invoices", {
        method: "POST",
        body: JSON.stringify(parsed),
      });
      if (!res.ok) throw await apiErrorFromResponse(res);
      return parseJson(res, invoiceResponseSchema);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.invoices.all });
      void qc.invalidateQueries({ queryKey: queryKeys.generalLedger.all });
    },
  });
}

/** @deprecated Use useCreateInvoiceMutation */
export const useCreateManualInvoiceMutation = useCreateInvoiceMutation;
