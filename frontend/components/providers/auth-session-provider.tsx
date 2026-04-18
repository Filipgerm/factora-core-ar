"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getApiOrigin } from "@/lib/api/client";
import {
  registerAuthSessionBridge,
  setSession as setSessionBridge,
  type StoredAuthProfile,
} from "@/lib/api/session";
import { authPublicResponseSchema } from "@/lib/schemas/auth";

const AuthBootstrapContext = createContext(false);

const SessionStateContext = createContext<{
  accessToken: string | null;
  profile: StoredAuthProfile | null;
  bootstrapDone: boolean;
  isDemoMode: boolean;
} | null>(null);

export function useAuthBootstrapReady(): boolean {
  return useContext(AuthBootstrapContext);
}

/** Session state for hooks; must be used inside AuthSessionProvider. */
export function useAuthSessionState() {
  const ctx = useContext(SessionStateContext);
  if (!ctx) {
    throw new Error("useAuthSessionState must be used within AuthSessionProvider");
  }
  return ctx;
}

/** True when the backend is running with ENVIRONMENT=demo. */
export function useIsDemoMode(): boolean {
  return useAuthSessionState().isDemoMode;
}

function profileFromPublic(res: {
  user_id: string;
  username: string;
  email: string;
  role: string;
  organization_id?: string | null;
  email_verified?: boolean;
  phone_verified?: boolean;
  saltedge_customer_id?: string | null;
}): StoredAuthProfile {
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

/**
 * Playwright can inject `window.__E2E_AUTH__` before hydration. That must never run in real
 * production: block unless explicitly opted in (e.g. `next start` E2E).
 */
function isE2EAuthBridgeEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  return process.env.NEXT_PUBLIC_ENABLE_E2E_AUTH_BRIDGE === "true";
}

/**
 * Attempt to silently restore the session from the httpOnly refresh cookie.
 * Returns whether the backend is running in demo mode (X-Demo-Mode: true header),
 * regardless of whether the refresh succeeded — demo mode is a backend concern
 * and the header is present on every response including 401s.
 */
async function postRefreshCookie(): Promise<{ ok: boolean; isDemoMode: boolean }> {
  const res = await fetch(`${getApiOrigin()}/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({}),
  });

  const isDemoMode = res.headers.get("X-Demo-Mode") === "true";

  if (!res.ok) return { ok: false, isDemoMode };
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, isDemoMode };
  }
  try {
    const data = authPublicResponseSchema.parse(body);
    setSessionBridge(data.access_token, profileFromPublic(data));
    return { ok: true, isDemoMode };
  } catch {
    return { ok: false, isDemoMode };
  }
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<StoredAuthProfile | null>(null);
  const [bootstrapDone, setBootstrapDone] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const accessRef = useRef<string | null>(null);
  const profileRef = useRef<StoredAuthProfile | null>(null);
  accessRef.current = accessToken;
  profileRef.current = profile;

  const setSession = useCallback((token: string, p: StoredAuthProfile) => {
    setAccessToken(token);
    setProfile(p);
  }, []);

  const setAccessTokenOnly = useCallback((token: string) => {
    setAccessToken(token);
  }, []);

  const clear = useCallback(() => {
    setAccessToken(null);
    setProfile(null);
  }, []);

  const bridge = useMemo(
    () => ({
      getAccessToken: () => accessRef.current,
      getProfile: () => profileRef.current,
      setSession,
      setAccessToken: setAccessTokenOnly,
      clear,
    }),
    [setSession, setAccessTokenOnly, clear]
  );

  useLayoutEffect(() => {
    registerAuthSessionBridge(bridge);
    return () => {
      registerAuthSessionBridge({
        getAccessToken: () => null,
        getProfile: () => null,
        setSession: () => {},
        setAccessToken: () => {},
        clear: () => {},
      });
    };
  }, [bridge]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window !== "undefined" && isE2EAuthBridgeEnabled()) {
        const injected = window.__E2E_AUTH__;
        if (injected?.token && injected.profile) {
          setSession(injected.token, injected.profile);
          if (!cancelled) setBootstrapDone(true);
          return;
        }
      }
      if (accessRef.current) {
        if (!cancelled) setBootstrapDone(true);
        return;
      }
      const { isDemoMode: demo } = await postRefreshCookie();
      if (!cancelled) {
        setIsDemoMode(demo);
        setBootstrapDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setSession]);

  const sessionValue = useMemo(
    () => ({
      accessToken,
      profile,
      bootstrapDone,
      isDemoMode,
    }),
    [accessToken, profile, bootstrapDone, isDemoMode]
  );

  return (
    <AuthBootstrapContext.Provider value={bootstrapDone}>
      <SessionStateContext.Provider value={sessionValue}>{children}</SessionStateContext.Provider>
    </AuthBootstrapContext.Provider>
  );
}
