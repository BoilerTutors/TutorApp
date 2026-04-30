import { API_BASE_URL } from "../config";
import { clearToken } from "../auth/storage";
console.log("[API_BASE_URL]", API_BASE_URL);

type RequestInitWithBody = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** Omit Authorization so login/signup work even if a stale token is in memory. */
  skipAuth?: boolean;
};

/** Called when a request returns 401 (after clearing token). Use to show a message and navigate to Login. */
let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

/**
 * Base URL for all backend requests. Use request() or get/post/etc. so every
 * call goes through one place (easy to add auth headers later).
 */
function url(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${p}`;
}

/** Optional auth token; set after login and clear on logout. */
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
  console.log("[Auth] token", token ? `set (length ${token.length})` : "cleared");
}

export function getAuthToken(): string | null {
  return authToken;
}

// Dev only: from browser console you can run getAuthToken() to inspect the token
if (typeof globalThis !== "undefined" && "window" in globalThis) {
  (globalThis as { getAuthToken?: () => string | null }).getAuthToken = getAuthToken;
}

function headers(init?: RequestInitWithBody): HeadersInit {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (authToken && !init?.skipAuth) {
    h["Authorization"] = `Bearer ${authToken}`;
  }
  return h;
}

function isLikelyNetworkFailure(err: unknown): boolean {
  if (err instanceof TypeError) {
    return true;
  }
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    return (
      m.includes("failed to fetch") ||
      m.includes("network request failed") ||
      m.includes("load failed") ||
      m.includes("networkerror")
    );
  }
  return false;
}

async function request<T>(
  path: string,
  init: RequestInitWithBody = {}
): Promise<T> {
  const { body, ...rest } = init;
  const href = url(path);
  let res: Response;
  try {
    console.log("[REQ]", rest.method, href);
    res = await fetch(href, {
      ...rest,
      headers: headers(init),
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  } catch (err) {
    if (isLikelyNetworkFailure(err)) {
      const devHint =
        typeof __DEV__ !== "undefined" && __DEV__
          ? ` The app is using ${API_BASE_URL}. Start the backend (uvicorn on port 8000; use --host 0.0.0.0 if testing on a phone). On a device, set EXPO_PUBLIC_API_URL or app.json extra.apiUrl to your computer’s LAN IP.`
          : " Check your network and that the API server is running.";
      throw new Error(`Cannot reach the server.${devHint}`);
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
  if (!res.ok) {
    if (res.status === 401) {
      const skipAuth = Boolean(init.skipAuth);
      // Authenticated call lost authorization (expired / revoked).
      if (authToken && !skipAuth) {
        authToken = null;
        await clearToken();
        onUnauthorized?.();
        throw new Error("Your session has expired. Please sign in again.");
      }
      // Login / register style: no Bearer sent, or skipAuth — treat as credential error.
      let detail: unknown;
      try {
        const parsed = (await res.json()) as { detail?: unknown };
        detail = parsed?.detail;
      } catch {
        detail = undefined;
      }
      if (detail === "Incorrect MFA code") {
        throw new Error(String(detail));
      }
      if (typeof detail === "string" && detail.trim()) {
        throw new Error(detail);
      }
      throw new Error("Invalid email or password.");
    }
    const text = await res.text();
    if (text) {
      try {
        const parsed = JSON.parse(text) as { detail?: unknown };
        const d = parsed.detail;
        if (Array.isArray(d)) {
          const msg = d
            .map((x) =>
              x && typeof x === "object" && "msg" in x
                ? String((x as { msg: string }).msg)
                : JSON.stringify(x)
            )
            .join("; ");
          if (msg) throw new Error(msg);
        } else if (typeof d === "string") {
          throw new Error(d);
        }
      } catch (e) {
        if (e instanceof SyntaxError) {
          // not JSON; fall through to generic error below
        } else {
          throw e;
        }
      }
    }
    throw new Error(text || `HTTP ${res.status}`);
  }
  // 204 No Content (or empty body): do not call res.json() or it throws
  if (res.status === 204) {
    return undefined as T;
  }
  const contentType = res.headers.get("content-type");
  const contentLength = res.headers.get("content-length");
  if (contentLength === "0") {
    return undefined as T;
  }
  if (contentType?.includes("application/json")) {
    const text = await res.text();
    if (!text || text.trim() === "") {
      return undefined as T;
    }
    return JSON.parse(text) as T;
  }
  return undefined as T;
}

export const api = {
  get:      <T>(path: string, init?: RequestInitWithBody) =>
    request<T>(path, { ...init, method: "GET" }),
  post:     <T>(path: string, body?: object, init?: RequestInitWithBody) =>
    request<T>(path, { ...init, method: "POST", body }),
  put:      <T>(path: string, body?: object, init?: RequestInitWithBody) =>
    request<T>(path, { ...init, method: "PUT", body }),
  patch:    <T>(path: string, body?: object, init?: RequestInitWithBody) =>
    request<T>(path, { ...init, method: "PATCH", body }),
  delete:   <T>(path: string, init?: RequestInitWithBody) =>
    request<T>(path, { ...init, method: "DELETE" }),
};
