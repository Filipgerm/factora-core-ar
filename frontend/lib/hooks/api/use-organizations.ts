"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { apiErrorFromResponse } from "@/lib/api/error";
import {
  setStoredProfile,
  setTokens,
  type StoredAuthProfile,
} from "@/lib/api/session";
import {
  switchOrganizationRequestSchema,
  switchOrganizationResponseSchema,
  userOrganizationMembershipItemSchema,
  type SwitchOrganizationResponse,
  type UserOrganizationMembershipItem,
} from "@/lib/schemas/organization";
import { useAuthSession } from "@/lib/hooks/api/use-auth";

function profileFromSwitch(res: SwitchOrganizationResponse): StoredAuthProfile {
  return {
    user_id: res.user_id,
    username: res.username,
    email: res.email,
    role: res.role,
    organization_id: res.organization_id ?? null,
    email_verified: res.email_verified ?? false,
    phone_verified: res.phone_verified ?? false,
  };
}

export function useOrganizationsListQuery() {
  const { data: session } = useAuthSession();
  const enabled = Boolean(session?.hasToken);

  return useQuery({
    queryKey: queryKeys.organizations.list(),
    queryFn: async (): Promise<UserOrganizationMembershipItem[]> => {
      const res = await apiFetch("/v1/organizations/");
      if (!res.ok) throw await apiErrorFromResponse(res);
      const json: unknown = await res.json();
      return z.array(userOrganizationMembershipItemSchema).parse(json);
    },
    enabled,
  });
}

export function useSwitchOrganizationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (organizationId: string) => {
      const body = switchOrganizationRequestSchema.parse({
        organization_id: organizationId,
      });
      const res = await apiFetch("/v1/organizations/switch", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await apiErrorFromResponse(res);
      const data = switchOrganizationResponseSchema.parse(await res.json());
      setTokens(data.access_token);
      setStoredProfile(profileFromSwitch(data));
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.organizations.all });
      void qc.invalidateQueries({ queryKey: queryKeys.organization.all });
      void qc.invalidateQueries({ queryKey: queryKeys.auth.session() });
      void qc.invalidateQueries({ queryKey: queryKeys.saltedge.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      void qc.invalidateQueries({ queryKey: queryKeys.mydata.all });
    },
  });
}
