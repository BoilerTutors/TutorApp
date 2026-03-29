import Constants from "expo-constants";
import { Platform } from "react-native";

/** Our app's expo.extra from app.json */
type ExpoExtra = { apiUrl?: string };

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function isLoopbackHostname(host: string): boolean {
  const h = host.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

function urlHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Backend API base URL. Set in app.json under expo.extra.apiUrl, or via
 * EXPO_PUBLIC_API_URL at build time (e.g. EAS). No trailing slash.
 *
 * In dev, `app.json` often uses localhost, which breaks Android emulator (use 10.0.2.2)
 * and physical devices (need your machine's LAN IP). When Expo provides `hostUri`
 * (e.g. 192.168.x.x:8081), we point the API at the same host on port 8000.
 */
const getApiUrl = (): string => {
  const extra = Constants.expoConfig?.extra as ExpoExtra | undefined;
  const fromExtra = typeof extra?.apiUrl === "string" ? extra.apiUrl.trim() : "";
  const envRaw =
    typeof process !== "undefined" && process.env
      ? (process.env as Record<string, string | undefined>).EXPO_PUBLIC_API_URL
      : undefined;
  const fromEnv = typeof envRaw === "string" && envRaw.trim() ? envRaw.trim() : "";

  const explicit = stripTrailingSlash(fromEnv || fromExtra || "");

  const hostUri = Constants.expoConfig?.hostUri;
  if (__DEV__ && hostUri && typeof hostUri === "string") {
    const host = hostUri.split(":")[0]?.trim() ?? "";
    if (host && !isLoopbackHostname(host)) {
      const explicitHost = explicit ? urlHostname(explicit) : null;
      const explicitIsLoopback = explicitHost != null && isLoopbackHostname(explicitHost);
      if (!explicit || explicitIsLoopback) {
        return `http://${host}:8000`;
      }
    }
  }

  if (__DEV__ && Platform.OS === "android") {
    if (!explicit) {
      return "http://10.0.2.2:8000";
    }
    const h = urlHostname(explicit);
    if (h == null || isLoopbackHostname(h)) {
      return "http://10.0.2.2:8000";
    }
  }

  if (explicit) {
    return explicit;
  }

  return "http://127.0.0.1:8000";
};

export const API_BASE_URL = getApiUrl();
