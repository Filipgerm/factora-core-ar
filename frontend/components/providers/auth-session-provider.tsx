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

function profileFromPublic(res: {
  user_id: string;
  username: string;
  email: string;
  role: string;
  organization_id?: string | null;
  email_verified?: boolean;
  phone_verified?: boolean;
}): StoredAuthProfile {
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

async function postRefreshCookie(): Promise<boolean> {
  const res = await fetch(`${getApiOrigin()}/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) return false;
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return false;
  }
  try {
    const data = authPublicResponseSchema.parse(body);
    setSessionBridge(data.access_token, profileFromPublic(data));
    return true;
  } catch {
    return false;
  }
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<StoredAuthProfile | null>(null);
  const [bootstrapDone, setBootstrapDone] = useState(false);

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
      if (accessRef.current) {
        if (!cancelled) setBootstrapDone(true);
        return;
      }
      await postRefreshCookie();
      if (!cancelled) setBootstrapDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sessionValue = useMemo(
    () => ({
      accessToken,
      profile,
      bootstrapDone,
    }),
    [accessToken, profile, bootstrapDone]
  );

  return (
    <AuthBootstrapContext.Provider value={bootstrapDone}>
      <SessionStateContext.Provider value={sessionValue}>{children}</SessionStateContext.Provider>
    </AuthBootstrapContext.Provider>
  );
}
