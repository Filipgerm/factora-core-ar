/**
 * In-memory auth session bridge. Values are owned by AuthSessionProvider (React state).
 * getAccessToken / getStoredProfile back the API client and non-React helpers.
 */

export type StoredAuthProfile = {
  user_id: string;
  username: string;
  email: string;
  role: string;
  organization_id: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  /** Primary Salt Edge customer id for the active org (from auth / switch-org payloads). */
  saltedge_customer_id: string | null;
};

export type AuthSessionBridge = {
  getAccessToken: () => string | null;
  getProfile: () => StoredAuthProfile | null;
  setSession: (accessToken: string, profile: StoredAuthProfile) => void;
  /** New access JWT only (profile unchanged), e.g. after silent refresh. */
  setAccessToken: (accessToken: string) => void;
  clear: () => void;
};

const noopBridge: AuthSessionBridge = {
  getAccessToken: () => null,
  getProfile: () => null,
  setSession: () => {},
  setAccessToken: () => {},
  clear: () => {},
};

let bridge: AuthSessionBridge = noopBridge;

export function registerAuthSessionBridge(next: AuthSessionBridge): void {
  bridge = next;
}

export function getAccessToken(): string | null {
  return bridge.getAccessToken();
}

export function getStoredProfile(): StoredAuthProfile | null {
  return bridge.getProfile();
}

export function setSession(accessToken: string, profile: StoredAuthProfile): void {
  bridge.setSession(accessToken, profile);
}

/** Refresh rotated access token only; profile unchanged. */
export function setAccessTokenOnly(accessToken: string): void {
  bridge.setAccessToken(accessToken);
}

/** @deprecated Use setSession — kept for incremental refactors. */
export function setTokens(
  accessToken: string,
  _refreshToken?: string | null
): void {
  bridge.setAccessToken(accessToken);
}

export function setStoredProfile(profile: StoredAuthProfile): void {
  const t = bridge.getAccessToken();
  bridge.setSession(t ?? "", profile);
}

export function clearSession(): void {
  bridge.clear();
}
