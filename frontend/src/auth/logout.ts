import { api, getAuthToken, setAuthToken } from "../api/client";
import { clearToken } from "./storage";

/** Clear in-memory token and persisted token. Call this then navigate to Login. */
export async function logout(): Promise<void> {
  if (getAuthToken()) {
    try {
      await api.post("/users/me/activity/offline");
    } catch {
      // Best effort.
    }
  }
  setAuthToken(null);
  await clearToken();
}
