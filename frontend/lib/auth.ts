/**
 * Client auth helpers. Prefer `useLoginMutation` / `useLogoutMutation` from `@/lib/hooks/api/use-auth` in React.
 */

import { apiFetch } from "@/lib/api/client";
import {
  clearSession,
  getAccessToken,
  getStoredProfile,
  setSession,
  type StoredAuthProfile,
} from "@/lib/api/session";
import { apiErrorFromResponse } from "@/lib/api/error";
import { authPublicResponseSchema } from "@/lib/schemas/auth";
import type { SignInCredentials, UserSession, UserType } from "@/lib/types/auth";

function profileToSession(p: StoredAuthProfile): UserSession {
  return {
    userId: p.user_id,
    username: p.username,
    email: p.email,
    role: p.role,
    organizationId: p.organization_id,
    emailVerified: p.email_verified,
    phoneVerified: p.phone_verified,
  };
}

/**
 * Password login (imperative). Validates response with Zod and persists access + profile in memory.
 */
export async function signIn(
  credentials: SignInCredentials,
  _userType?: UserType
): Promise<{ access_token: string; profile: UserSession }> {
  const email = credentials.email ?? credentials.username;
  if (!email || !credentials.password) {
    throw new Error("Email and password are required");
  }

  const res = await apiFetch("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: credentials.password }),
    skipAuth: true,
  });

  if (!res.ok) {
    throw await apiErrorFromResponse(res);
  }

  const data = authPublicResponseSchema.parse(await res.json());
  const stored = {
    user_id: data.user_id,
    username: data.username,
    email: data.email,
    role: data.role,
    organization_id: data.organization_id ?? null,
    email_verified: data.email_verified ?? false,
    phone_verified: data.phone_verified ?? false,
  };
  setSession(data.access_token, stored);

  return {
    access_token: data.access_token,
    profile: profileToSession(stored),
  };
}

export function getSession(): UserSession | null {
  const profile = getStoredProfile();
  if (!profile?.user_id) return null;
  return profileToSession(profile);
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}

/**
 * Revokes refresh session (httpOnly cookie) and clears in-memory access state.
 */
export async function signOut(): Promise<void> {
  try {
    const res = await apiFetch("/v1/auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
      skipAuth: true,
    });
    if (!res.ok && res.status !== 401) {
      await apiErrorFromResponse(res);
    }
  } catch {
    /* still clear locally */
  }
  clearSession();
}

/**
 * @deprecated No backend endpoint — updates local profile only for legacy callers.
 * TODO: Phase 2 Backend — user preferences / persona endpoint if still needed.
 */
export async function updateUserType(_newUserType: UserType): Promise<void> {
  const current = getStoredProfile();
  if (!current?.user_id) {
    throw new Error("No active session found");
  }
  setSession(getAccessToken() ?? "", { ...current });
}
