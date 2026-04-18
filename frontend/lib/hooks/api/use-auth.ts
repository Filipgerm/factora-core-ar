"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuthSessionState } from "@/components/providers/auth-session-provider";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { clearSession, setSession, type StoredAuthProfile } from "@/lib/api/session";
import { apiErrorFromResponse } from "@/lib/api/error";
import {
  authPublicResponseSchema,
  messageResponseSchema,
  userProfileResponseSchema,
  type AuthPublicResponse,
  type GoogleAuthRequest,
  type LoginRequest,
  type RefreshTokenRequest,
  type SignUpRequest,
} from "@/lib/schemas/auth";

function profileFromAuth(res: AuthPublicResponse): StoredAuthProfile {
  return {
    user_id: res.user_id,
    username: res.username,
    email: res.email,
    role: res.role,
    organization_id: res.organization_id ?? null,
    email_verified: res.email_verified ?? false,
    phone_verified: res.phone_verified ?? false,
    saltedge_customer_id: res.saltedge_customer_id?.trim() || null,
  };
}

async function parseJson<T>(
  res: Response,
  schema: { parse: (data: unknown) => T }
): Promise<T> {
  const json = await res.json();
  return schema.parse(json);
}

/** Mirrors prior TanStack shape: `{ data: { profile, hasToken } }` for consumers. */
export function useAuthSession() {
  const { accessToken, profile, bootstrapDone } = useAuthSessionState();
  return {
    data: {
      profile,
      hasToken: Boolean(accessToken),
    },
    isLoading: !bootstrapDone,
    isSuccess: bootstrapDone,
    isError: false,
    error: null,
  };
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
      const data = await parseJson(res, authPublicResponseSchema);
      setSession(data.access_token, profileFromAuth(data));
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.organization.all });
      void qc.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
  });
}

/** Registers via `POST /v1/auth/signup`; returns profile only (no tokens). User must log in next. */
export function useSignupMutation() {
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
  });
}

/** Alias for `useSignupMutation` (same hook). */
export const useSignup = useSignupMutation;

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
      const data = await parseJson(res, authPublicResponseSchema);
      setSession(data.access_token, profileFromAuth(data));
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.organization.all });
      void qc.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
  });
}

export function useLogoutMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/v1/auth/logout", {
        method: "POST",
        body: JSON.stringify({} satisfies RefreshTokenRequest),
        skipAuth: true,
      });
      if (!res.ok && res.status !== 401) {
        throw await apiErrorFromResponse(res);
      }
      clearSession();
    },
    onSettled: () => {
      void qc.removeQueries({ queryKey: queryKeys.organization.all });
      void qc.removeQueries({ queryKey: queryKeys.organizations.all });
      void qc.removeQueries({ queryKey: queryKeys.saltedge.all });
      void qc.removeQueries({ queryKey: queryKeys.dashboard.all });
      void qc.removeQueries({ queryKey: queryKeys.mydata.all });
    },
  });
}

export function useRefreshMutation() {
  return useMutation({
    mutationFn: async (_body: RefreshTokenRequest = {}) => {
      const res = await apiFetch("/v1/auth/refresh", {
        method: "POST",
        body: JSON.stringify({}),
        skipAuth: true,
      });
      if (!res.ok) throw await apiErrorFromResponse(res);
      const data = await parseJson(res, authPublicResponseSchema);
      setSession(data.access_token, profileFromAuth(data));
      return data;
    },
  });
}

export function useDemoLoginMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/v1/auth/demo-login", {
        method: "POST",
        skipAuth: true,
      });
      if (!res.ok) throw await apiErrorFromResponse(res);
      const data = await parseJson(res, authPublicResponseSchema);
      setSession(data.access_token, profileFromAuth(data));
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.organization.all });
      void qc.invalidateQueries({ queryKey: queryKeys.organizations.all });
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
