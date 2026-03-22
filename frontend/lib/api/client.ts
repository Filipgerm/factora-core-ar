/**
 * API origin: `NEXT_PUBLIC_API_URL` (required at runtime, e.g. http://127.0.0.1:8000).
 * Paths must include the `/v1/...` prefix.
 */

import { apiErrorFromResponse } from "@/lib/api/error";
import { ApiError } from "@/lib/api/types";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/api/session";
import { authResponseSchema } from "@/lib/schemas/auth";

export function getApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. Define it in your environment (e.g. http://127.0.0.1:8000)."
    );
  }
  return raw.replace(/\/$/, "");
}

let refreshInFlight: Promise<boolean> | null = null;

function buildRequestHeaders(
  initHeaders: HeadersInit | undefined,
  body: BodyInit | null | undefined,
  accessToken: string | null
): Headers {
  const h = new Headers();
  if (initHeaders) {
    new Headers(initHeaders).forEach((value, key) => {
      h.set(key, value);
    });
  }
  if (!h.has("Accept")) {
    h.set("Accept", "application/json");
  }
  if (body && typeof body === "string" && !h.has("Content-Type")) {
    h.set("Content-Type", "application/json");
  }
  if (accessToken) {
    h.set("Authorization", `Bearer ${accessToken}`);
  }
  return h;
}

/** Headers for 401 retry: fresh Bearer only, no reuse of prior Header instances. */
function buildRetryHeaders(
  body: BodyInit | null | undefined,
  accessToken: string | null
): Headers {
  const h = new Headers();
  h.set("Accept", "application/json");
  if (body && typeof body === "string") {
    h.set("Content-Type", "application/json");
  }
  if (accessToken) {
    h.set("Authorization", `Bearer ${accessToken}`);
  }
  return h;
}

async function postRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const res = await fetch(`${getApiOrigin()}/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
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

  try {
    const data = authResponseSchema.parse(body);
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
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

const defaultCredentials: RequestCredentials = "include";

export async function apiFetch(
  path: string,
  init: ApiFetchOptions = {}
): Promise<Response> {
  const { skipAuth, headers: initHeaders, ...rest } = init;
  const url = `${getApiOrigin()}${path.startsWith("/") ? path : `/${path}`}`;

  const body = rest.body ?? null;
  const headers = buildRequestHeaders(
    initHeaders,
    body,
    skipAuth ? null : getAccessToken()
  );

  const credentials = rest.credentials ?? defaultCredentials;

  let res = await fetch(url, {
    ...rest,
    credentials,
    headers,
  });

  if (res.status === 401 && !skipAuth && getRefreshToken()) {
    const ok = await tryRefreshSession();
    if (ok) {
      const retryHeaders = buildRetryHeaders(body, getAccessToken());
      res = await fetch(url, {
        ...rest,
        credentials,
        headers: retryHeaders,
      });
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
  const res = await apiFetch(path, init);
  if (!res.ok) {
    throw await parseErrorResponse(res);
  }
  return res.blob();
}
