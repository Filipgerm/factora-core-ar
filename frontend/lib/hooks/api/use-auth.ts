"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  getStoredProfile,
  setStoredProfile,
  setTokens,
  type StoredAuthProfile,
} from "@/lib/api/session";
import { apiErrorFromResponse } from "@/lib/api/error";
import {
  authResponseSchema,
  messageResponseSchema,
  userProfileResponseSchema,
  type AuthResponse,
  type GoogleAuthRequest,
  type LoginRequest,
  type RefreshTokenRequest,
  type SignUpRequest,
} from "@/lib/schemas/auth";

function profileFromAuth(res: AuthResponse): StoredAuthProfile {
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

async function parseJson<T>(
  res: Response,
  schema: { parse: (data: unknown) => T }
): Promise<T> {
  const json = await res.json();
  return schema.parse(json);
}

export function useAuthSession() {
  return useQuery({
    queryKey: queryKeys.auth.session(),
    queryFn: (): { profile: StoredAuthProfile | null; hasToken: boolean } => {
      const token = getAccessToken();
      const profile = getStoredProfile();
      return { profile, hasToken: Boolean(token) };
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useLoginMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: LoginRequest) => {
      const res = await apiFetch("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
        skipAuth: true,
      });
      if (!res.ok) throw await apiErrorFromResponse(res);
      const data = await parseJson(res, authResponseSchema);
      setTokens(data.access_token, data.refresh_token);
      setStoredProfile(profileFromAuth(data));
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.auth.session() });
      void qc.invalidateQueries({ queryKey: queryKeys.organization.all });
      void qc.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
  });
}

export function useSignUpMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: SignUpRequest) => {
      const res = await apiFetch("/v1/auth/signup", {
        method: "POST",
        body: JSON.stringify(body),
        skipAuth: true,
      });
      if (!res.ok) throw await apiErrorFromResponse(res);
      return parseJson(res, userProfileResponseSchema);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.auth.session() });
    },
  });
}

export function useGoogleAuthMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: GoogleAuthRequest) => {
      const res = await apiFetch("/v1/auth/google", {
        method: "POST",
        body: JSON.stringify(body),
        skipAuth: true,
      });
      if (!res.ok) throw await apiErrorFromResponse(res);
      const data = await parseJson(res, authResponseSchema);
      setTokens(data.access_token, data.refresh_token);
      setStoredProfile(profileFromAuth(data));
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.auth.session() });
      void qc.invalidateQueries({ queryKey: queryKeys.organization.all });
      void qc.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
  });
}

export function useLogoutMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const refresh = getRefreshToken();
      if (refresh) {
        const res = await apiFetch("/v1/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refresh_token: refresh } satisfies RefreshTokenRequest),
          skipAuth: true,
        });
        if (!res.ok && res.status !== 401) {
          throw await apiErrorFromResponse(res);
        }
      }
      clearSession();
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.auth.session() });
      void qc.removeQueries({ queryKey: queryKeys.organization.all });
      void qc.removeQueries({ queryKey: queryKeys.organizations.all });
      void qc.removeQueries({ queryKey: queryKeys.saltedge.all });
      void qc.removeQueries({ queryKey: queryKeys.dashboard.all });
      void qc.removeQueries({ queryKey: queryKeys.mydata.all });
    },
  });
}

export function useRefreshMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: RefreshTokenRequest) => {
      const res = await apiFetch("/v1/auth/refresh", {
        method: "POST",
        body: JSON.stringify(body),
        skipAuth: true,
      });
      if (!res.ok) throw await apiErrorFromResponse(res);
      const data = await parseJson(res, authResponseSchema);
      setTokens(data.access_token, data.refresh_token);
      setStoredProfile(profileFromAuth(data));
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.auth.session() });
    },
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await apiFetch("/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
        skipAuth: true,
      });
      if (!res.ok) throw await apiErrorFromResponse(res);
      return parseJson(res, messageResponseSchema);
    },
  });
}
