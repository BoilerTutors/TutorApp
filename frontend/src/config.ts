import Constants from "expo-constants";
import { Platform } from "react-native";

const getApiUrl = (): string => {
  // 1. Explicit env var (EAS builds, etc.)
  const fromEnv =
    typeof process !== "undefined" &&
    process.env &&
    (process.env as Record<string, string | undefined>).EXPO_PUBLIC_API_URL;
  if (typeof fromEnv === "string" && fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  // 2. Running in Expo Go on a device — derive the PC's IP from the dev server
  if (__DEV__) {
    const debuggerHost =
      Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
    if (debuggerHost) {
      const ip = debuggerHost.split(":")[0];
      return `http://${ip}:8000`;
    }
  }

  // 3. Fallback (web browser, etc.)
  return "http://127.0.0.1:8000";
};

export const API_BASE_URL = getApiUrl();