"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { apiErrorFromResponse } from "@/lib/api/types";
import {
  aadeDocumentsResponseSchema,
  aadeSummaryResponseSchema,
  dashboardMetricsResponseSchema,
  sellerMetricsResponseSchema,
  transactionsResponseSchema,
  type AadeDocumentsResponse,
  type AadeSummaryResponse,
  type DashboardMetricsResponse,
  type SellerMetricsResponse,
  type TransactionsResponse,
} from "@/lib/schemas/dashboard";
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

export function useDashboardSellerMetricsQuery() {
  const hasOrg = useHasOrg();
  return useQuery({
    queryKey: queryKeys.dashboard.sellerMetrics(),
    queryFn: async (): Promise<SellerMetricsResponse> => {
      const res = await apiFetch("/v1/dashboard/seller-metrics");
      if (!res.ok) throw await apiErrorFromResponse(res);
      return parseJson(res, sellerMetricsResponseSchema);
    },
    enabled: hasOrg,
  });
}

export type PlMetricsParams = {
  customerId: string;
  days?: number;
  start_date?: string;
  end_date?: string;
  currency?: string;
};

export function useDashboardPlMetricsQuery(params: PlMetricsParams | null) {
  const hasOrg = useHasOrg();
  const enabled = Boolean(hasOrg && params?.customerId);

  return useQuery({
    queryKey: queryKeys.dashboard.plMetrics({
      customer_id: params?.customerId ?? "",
      days: params?.days ?? 30,
      start: params?.start_date ?? "",
      end: params?.end_date ?? "",
      currency: params?.currency ?? "EUR",
    }),
    queryFn: async (): Promise<DashboardMetricsResponse> => {
      if (!params?.customerId) {
        throw new Error("customerId required");
      }
      const sp = new URLSearchParams();
      sp.set("customer_id", params.customerId);
      sp.set("days", String(params.days ?? 30));
      if (params.start_date) sp.set("start_date", params.start_date);
      if (params.end_date) sp.set("end_date", params.end_date);
      sp.set("currency", params.currency ?? "EUR");
      const res = await apiFetch(`/v1/dashboard/pl-metrics?${sp.toString()}`);
      if (!res.ok) throw await apiErrorFromResponse(res);
      return parseJson(res, dashboardMetricsResponseSchema);
    },
    enabled,
  });
}

export type TransactionsQueryParams = {
  customerId: string;
  account_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
};

export function useDashboardTransactionsQuery(params: TransactionsQueryParams | null) {
  const hasOrg = useHasOrg();
  const enabled = Boolean(hasOrg && params?.customerId);

  return useQuery({
    queryKey: queryKeys.dashboard.transactions({
      customer_id: params?.customerId ?? "",
      account: params?.account_id ?? "",
      limit: params?.limit ?? 50,
    }),
    queryFn: async (): Promise<TransactionsResponse[]> => {
      if (!params?.customerId) throw new Error("customerId required");
      const sp = new URLSearchParams();
      sp.set("customer_id", params.customerId);
      if (params.account_id) sp.set("account_id", params.account_id);
      if (params.status) sp.set("status", params.status);
      if (params.start_date) sp.set("start_date", params.start_date);
      if (params.end_date) sp.set("end_date", params.end_date);
      sp.set("limit", String(params.limit ?? 50));
      const res = await apiFetch(`/v1/dashboard/transactions?${sp.toString()}`);
      if (!res.ok) throw await apiErrorFromResponse(res);
      const json: unknown = await res.json();
      return z.array(transactionsResponseSchema).parse(json);
    },
    enabled,
  });
}

export type AadeDocumentsParams = {
  date_from?: string;
  date_to?: string;
  invoice_type?: string;
  issuer_vat?: string;
  counterpart_vat?: string;
  limit?: number;
  offset?: number;
};

export function useDashboardAadeDocumentsQuery(params: AadeDocumentsParams = {}) {
  const hasOrg = useHasOrg();
  return useQuery({
    queryKey: queryKeys.dashboard.aadeDocuments({
      from: params.date_from ?? "",
      to: params.date_to ?? "",
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    }),
    queryFn: async (): Promise<AadeDocumentsResponse> => {
      const sp = new URLSearchParams();
      if (params.date_from) sp.set("date_from", params.date_from);
      if (params.date_to) sp.set("date_to", params.date_to);
      if (params.invoice_type) sp.set("invoice_type", params.invoice_type);
      if (params.issuer_vat) sp.set("issuer_vat", params.issuer_vat);
      if (params.counterpart_vat)
        sp.set("counterpart_vat", params.counterpart_vat);
      sp.set("limit", String(params.limit ?? 50));
      sp.set("offset", String(params.offset ?? 0));
      const res = await apiFetch(`/v1/dashboard/aade-documents?${sp.toString()}`);
      if (!res.ok) throw await apiErrorFromResponse(res);
      return parseJson(res, aadeDocumentsResponseSchema);
    },
    enabled: hasOrg,
  });
}

export function useDashboardAadeSummaryQuery() {
  const hasOrg = useHasOrg();
  return useQuery({
    queryKey: queryKeys.dashboard.aadeSummary(),
    queryFn: async (): Promise<AadeSummaryResponse> => {
      const res = await apiFetch("/v1/dashboard/aade-summary");
      if (!res.ok) throw await apiErrorFromResponse(res);
      return parseJson(res, aadeSummaryResponseSchema);
    },
    enabled: hasOrg,
  });
}
