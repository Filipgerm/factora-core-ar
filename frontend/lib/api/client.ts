/**
 * Base URL: NEXT_PUBLIC_API_URL (e.g. http://127.0.0.1:8000). Paths must include /v1/...
 */

import { apiErrorFromResponse } from "@/lib/api/error";
import { ApiError } from "@/lib/api/types";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/api/session";

function getApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  const base = raw && raw.length > 0 ? raw : "http://127.0.0.1:8000";
  return base.replace(/\/$/, "");
}

let refreshInFlight: Promise<boolean> | null = null;

async function postRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  // TODO: Phase 2 Backend — include refresh_token on AuthResponse (and return it from login/refresh/google).
  // Until then, silent refresh usually cannot run because login responses omit refresh_token.
  const res = await fetch(`${getApiOrigin()}/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    return false;
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return false;
  }

  const obj = body as Record<string, unknown>;
  const access = obj.access_token;
  if (typeof access !== "string") {
    return false;
  }

  const nextRefresh =
    typeof obj.refresh_token === "string" ? obj.refresh_token : refreshToken;
  setTokens(access, nextRefresh);
  return true;
}

async function tryRefreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = postRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function parseErrorResponse(res: Response): Promise<ApiError> {
  return apiErrorFromResponse(res);
}

export type ApiFetchOptions = RequestInit & {
  /** Skip Authorization header and refresh (e.g. login) */
  skipAuth?: boolean;
};

export async function apiFetch(
  path: string,
  init: ApiFetchOptions = {}
): Promise<Response> {
  const { skipAuth, headers: initHeaders, ...rest } = init;
  const url = `${getApiOrigin()}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(initHeaders);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const body = rest.body;
  if (body && typeof body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let res = await fetch(url, { ...rest, headers });

  if (res.status === 401 && !skipAuth && getRefreshToken()) {
    const ok = await tryRefreshSession();
    if (ok) {
      const retryHeaders = new Headers(initHeaders);
      if (!retryHeaders.has("Accept")) {
        retryHeaders.set("Accept", "application/json");
      }
      if (body && typeof body === "string" && !retryHeaders.has("Content-Type")) {
        retryHeaders.set("Content-Type", "application/json");
      }
      const t = getAccessToken();
      if (t) retryHeaders.set("Authorization", `Bearer ${t}`);
      res = await fetch(url, { ...rest, headers: retryHeaders });
    }
  }

  if (res.status === 401 && !skipAuth) {
    clearSession();
  }

  return res;
}

export async function apiFetchJson<T>(
  path: string,
  init: ApiFetchOptions = {}
): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    throw await parseErrorResponse(res);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export async function apiFetchBlob(
  path: string,
  init: ApiFetchOptions = {}
): Promise<Blob> {
  const res = await apiFetch(path, { ...init, headers: init.headers });
  if (!res.ok) {
    throw await parseErrorResponse(res);
  }
  return res.blob();
}

export { getApiOrigin };
