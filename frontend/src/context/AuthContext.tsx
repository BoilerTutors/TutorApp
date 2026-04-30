import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { setAuthToken, getAuthToken } from "../api/client";
import { saveToken, loadToken, clearToken } from "../auth/storage";
import { authApi, usersApi, UserPublic, UserCreate, LoginRequest, Token } from "../services/api";
import { API_BASE_URL } from "../config";

export type ActiveRole = "STUDENT" | "TUTOR";

type AuthContextType = {
  user: UserPublic | null;
  token: string | null;
  activeRole: ActiveRole | null;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: UserCreate) => Promise<UserPublic>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
  setActiveRole: (role: ActiveRole) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function probeUserWithToken(token: string): Promise<UserPublic | null> {
  const res = await fetch(`${API_BASE_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    return null;
  }
  return (await res.json()) as UserPublic;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeRole, setActiveRoleState] = useState<ActiveRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load token from storage on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await loadToken();
      if (storedToken) {
        setAuthToken(storedToken);
        setToken(storedToken);
        const userInfo = await probeUserWithToken(storedToken);
        setUser(userInfo);
        // Default activeRole on bootstrap: tutor if they're a tutor, else student
        if (userInfo) {
          setActiveRoleState(userInfo.is_tutor ? "TUTOR" : "STUDENT");
        }
      }
    } catch (err) {
      // Token expired or invalid
      setAuthToken(null);
      await clearToken();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (data: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const tokenResponse: Token = await authApi.login(data);
      const accessToken = tokenResponse.access_token;
      
      // Store token
      await saveToken(accessToken);
      setAuthToken(accessToken);
      setToken(accessToken);
      
      // Fetch user info
      const userInfo = await authApi.getMe();
      setUser(userInfo);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: UserCreate): Promise<UserPublic> => {
    setIsLoading(true);
    setError(null);
    try {
      const newUser = await usersApi.register(data);
      return newUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setAuthToken(null);
    await clearToken();
    setToken(null);
    setUser(null);
    setActiveRoleState(null);
  };

  const clearError = () => setError(null);

  const refreshUser = async () => {
    if (token) {
      try {
        const userInfo = await authApi.getMe();
        setUser(userInfo);
      } catch (err) {
        console.error("Failed to refresh user:", err);
      }
    }
  };

  const setActiveRole = (role: ActiveRole) => {
    setActiveRoleState(role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeRole,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
        refreshUser,
        setActiveRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}