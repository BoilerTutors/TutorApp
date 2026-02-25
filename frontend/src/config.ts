import Constants from "expo-constants";

/** Our app's expo.extra from app.json */
type ExpoExtra = { apiUrl?: string };

/**
 * Backend API base URL. Set in app.json under expo.extra.apiUrl, or via
 * EXPO_PUBLIC_API_URL at build time (e.g. EAS). No trailing slash.
 */
const getApiUrl = (): string => {
  const extra = Constants.expoConfig?.extra as ExpoExtra | undefined;
  const fromExtra = extra?.apiUrl;
  if (typeof fromExtra === "string" && fromExtra) {
    return fromExtra.replace(/\/$/, "");
  }
  const fromEnv =
    typeof process !== "undefined" &&
    process.env &&
    (process.env as Record<string, string | undefined>).EXPO_PUBLIC_API_URL;
  if (typeof fromEnv === "string" && fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return "http://localhost:8000";
};

export const API_BASE_URL = getApiUrl();
