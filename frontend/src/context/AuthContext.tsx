import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken } from '../api/client';
import type { AuthResponse, SignInPayload, SignUpPayload, User } from '../api/types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (payload: SignInPayload) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'students-crm-token';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applyAuthResponse = useCallback((response: AuthResponse) => {
    setAuthToken(response.accessToken);
    localStorage.setItem(TOKEN_KEY, response.accessToken);
    setToken(response.accessToken);
    setUser(response.user);
  }, []);

  const clearAuthState = useCallback(() => {
    setAuthToken(null);
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const profile = await api.getProfile();
      setUser(profile);
    } catch {
      clearAuthState();
    }
  }, [token, clearAuthState]);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }

    setAuthToken(stored);
    setToken(stored);
    api
      .getProfile()
      .then(setUser)
      .catch(() => {
        clearAuthState();
      })
      .finally(() => {
        setLoading(false);
      });
  }, [clearAuthState]);

  const signIn = useCallback(
    async (payload: SignInPayload) => {
      setLoading(true);
      try {
        const response = await api.signIn(payload);
        applyAuthResponse(response);
      } finally {
        setLoading(false);
      }
    },
    [applyAuthResponse],
  );

  const signUp = useCallback(
    async (payload: SignUpPayload) => {
      setLoading(true);
      try {
        const response = await api.signUp(payload);
        applyAuthResponse(response);
      } finally {
        setLoading(false);
      }
    },
    [applyAuthResponse],
  );

  const logout = useCallback(() => {
    clearAuthState();
  }, [clearAuthState]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      signIn,
      signUp,
      logout,
      refreshProfile,
    }),
    [user, token, loading, signIn, signUp, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
