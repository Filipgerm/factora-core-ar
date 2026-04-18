"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { apiErrorFromResponse } from "@/lib/api/error";
import { connectionActionResponseSchema } from "@/lib/schemas/saltedge/connections";
import {
  customersResponseSchema,
  type CustomersResponse,
  type SaltEdgeCustomer,
} from "@/lib/schemas/saltedge/customers";
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

/**
 * Resolve Salt Edge customer id: env override → session profile (DB primary for org) →
 * first row from `GET /v1/saltedge/customers`.
 */
export function useResolvedSaltEdgeCustomerId() {
  const envId = process.env.NEXT_PUBLIC_SALTEDGE_CUSTOMER_ID?.trim() || null;
  const { data: session } = useAuthSession();
  const profileId = session?.profile?.saltedge_customer_id?.trim() || null;
  const q = useSaltEdgeCustomersQuery();

  const withIds =
    q.data?.data?.filter((c: SaltEdgeCustomer) => c.customer_id) ?? [];
  const fromApi = withIds[0]?.customer_id ?? null;
  const customerId = envId || profileId || fromApi || null;
  const ambiguous = !envId && !profileId && withIds.length > 1;
  const needsApi = !envId && !profileId;
  const isLoading = Boolean(needsApi && q.isLoading);
  const isError = Boolean(needsApi && q.isError);

  return {
    customerId,
    isLoading,
    isError,
    refetchCustomers: q.refetch,
    source: envId
      ? ("env" as const)
      : profileId
        ? ("profile" as const)
        : fromApi
          ? ("api" as const)
          : null,
    ambiguous,
  };
}

export function useSaltEdgeCustomersQuery() {
  const hasOrg = useHasOrg();
  return useQuery({
    queryKey: queryKeys.saltedge.customers(),
    queryFn: async (): Promise<CustomersResponse> => {
      const res = await apiFetch("/v1/saltedge/customers");
      if (!res.ok) throw await apiErrorFromResponse(res);
      return parseJson(res, customersResponseSchema);
    },
    enabled: hasOrg,
  });
}

export function useSaltEdgeConnectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await apiFetch("/v1/saltedge/connections/connect", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw await apiErrorFromResponse(res);
      return parseJson(res, connectionActionResponseSchema);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.saltedge.all });
    },
  });
}

