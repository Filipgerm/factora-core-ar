/**
 * Token + profile persistence for SPA auth. Access token is sent as Bearer;
 * refresh token is stored only if the API returns it (see Phase 2 backend note in apiFetch).
 */

const ACCESS = "factora_access_token";
const REFRESH = "factora_refresh_token";
const PROFILE = "factora_auth_profile";

export type StoredAuthProfile = {
  user_id: string;
  username: string;
  email: string;
  role: string;
  organization_id: string | null;
  email_verified: boolean;
  phone_verified: boolean;
};

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}

function writeStorage(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  if (value === null) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
}

export function getAccessToken(): string | null {
  return readStorage(ACCESS);
}

export function getRefreshToken(): string | null {
  return readStorage(REFRESH);
}

export function getStoredProfile(): StoredAuthProfile | null {
  const raw = readStorage(PROFILE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuthProfile;
  } catch {
    return null;
  }
}

export function setTokens(accessToken: string, refreshToken?: string | null): void {
  writeStorage(ACCESS, accessToken);
  if (refreshToken) writeStorage(REFRESH, refreshToken);
}

export function setStoredProfile(profile: StoredAuthProfile): void {
  writeStorage(PROFILE, JSON.stringify(profile));
}

export function clearSession(): void {
  writeStorage(ACCESS, null);
  writeStorage(REFRESH, null);
  writeStorage(PROFILE, null);
}
