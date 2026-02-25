import { setAuthToken } from "../api/client";
import { clearToken } from "./storage";

/** Clear in-memory token and persisted token. Call this then navigate to Login. */
export async function logout(): Promise<void> {
  setAuthToken(null);
  await clearToken();
}
