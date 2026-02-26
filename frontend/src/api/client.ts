import { API_BASE_URL } from "../config";
import { clearToken } from "../auth/storage";

type RequestInitWithBody = Omit<RequestInit, "body"> & { body?: unknown };

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
  if (authToken) {
    h["Authorization"] = `Bearer ${authToken}`;
  }
  return h;
}

async function request<T>(
  path: string,
  init: RequestInitWithBody = {}
): Promise<T> {
  const { body, ...rest } = init;
  const res = await fetch(url(path), {
    ...rest,
    headers: headers(init),
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  if (!res.ok) {
    if (res.status === 401) {
      // Had a token → session expired: clear and notify so app can redirect to Login.
      if (authToken) {
        authToken = null;
        await clearToken();
        onUnauthorized?.();
        throw new Error("Your session has expired. Please sign in again.");
      }
      // No token (e.g. wrong login credentials): show message on the login screen.
      throw new Error("Invalid email or password.");
    }
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  // 204 No Content (or empty body): do not call res.json() or it throws
  if (res.status === 204) {
    return undefined as T;
  }
  const contentType = res.headers.get("content-type");
  const contentLength = res.headers.get("content-length");
  if (contentLength === "0" || !res.body) {
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
