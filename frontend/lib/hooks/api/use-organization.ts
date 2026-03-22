"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { apiErrorFromResponse } from "@/lib/api/error";
import {
  businessResponseSchema,
  counterpartyCreateSchema,
  counterpartyResponseSchema,
  counterpartyUpdateSchema,
  organizationSetupRequestSchema,
  type BusinessResponse,
  type CounterpartyCreate,
  type CounterpartyResponse,
  type CounterpartyUpdate,
  type OrganizationSetupRequest,
} from "@/lib/schemas/organization";
import { useAuthSession } from "@/lib/hooks/api/use-auth";

async function parseJson<T>(
  res: Response,
  schema: { parse: (data: unknown) => T }
): Promise<T> {
  const json = await res.json();
  return schema.parse(json);
}

export function useOrganizationMeQuery() {
  const { data: session } = useAuthSession();
  const enabled = Boolean(
    session?.hasToken && session.profile?.organization_id
  );

  return useQuery({
    queryKey: queryKeys.organization.me(),
    queryFn: async (): Promise<BusinessResponse> => {
      const res = await apiFetch("/v1/organization/me");
      if (!res.ok) throw await apiErrorFromResponse(res);
      return parseJson(res, businessResponseSchema);
    },
    enabled,
    retry: (count, err) => {
      if (
        typeof err === "object" &&
        err !== null &&
        "status" in err &&
        (err as { status: number }).status === 404
      ) {
        return false;
      }
      return count < 2;
    },
  });
}

export function useSetupOrganizationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: OrganizationSetupRequest) => {
      organizationSetupRequestSchema.parse(body);
      const res = await apiFetch("/v1/organization/", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await apiErrorFromResponse(res);
      return parseJson(res, businessResponseSchema);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.organization.me() });
      void qc.invalidateQueries({ queryKey: queryKeys.auth.session() });
    },
  });
}

export function useCounterpartiesQuery() {
  const { data: session } = useAuthSession();
  const enabled = Boolean(
    session?.hasToken && session.profile?.organization_id
  );

  return useQuery({
    queryKey: queryKeys.organization.counterparties(),
    queryFn: async (): Promise<CounterpartyResponse[]> => {
      const res = await apiFetch("/v1/organization/counterparties");
      if (!res.ok) throw await apiErrorFromResponse(res);
      const json: unknown = await res.json();
      return z.array(counterpartyResponseSchema).parse(json);
    },
    enabled,
  });
}

export function useCreateCounterpartyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CounterpartyCreate) => {
      counterpartyCreateSchema.parse(body);
      const res = await apiFetch("/v1/organization/counterparties", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await apiErrorFromResponse(res);
      return parseJson(res, counterpartyResponseSchema);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.organization.counterparties() });
    },
  });
}

export function useUpdateCounterpartyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: CounterpartyUpdate;
    }) => {
      counterpartyUpdateSchema.parse(body);
      const res = await apiFetch(`/v1/organization/counterparties/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await apiErrorFromResponse(res);
      return parseJson(res, counterpartyResponseSchema);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.organization.counterparties() });
    },
  });
}

export function useDeleteCounterpartyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/v1/organization/counterparties/${id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) throw await apiErrorFromResponse(res);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.organization.counterparties() });
    },
  });
}
