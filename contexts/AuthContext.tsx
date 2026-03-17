import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  AuthResponse,
  UserProfile,
  getProfile,
  login as loginRequest,
  register as registerRequest,
} from '@/lib/api';

interface AuthContextValue {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { name: string; email: string; phone?: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

interface StoredSession {
  accessToken: string;
  refreshToken: string | null;
}

const AUTH_STORAGE_KEY = 'salaoapp.auth.session';
let memorySession: StoredSession | null = null;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredSession(): StoredSession | null {
  if (memorySession) {
    return memorySession;
  }

  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as StoredSession;
      memorySession = parsed;
      return parsed;
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  return null;
}

function persistSession(session: StoredSession | null) {
  memorySession = session;

  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    if (session) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }
}

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyAuthResponse = async (response: AuthResponse) => {
    persistSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken ?? null,
    });

    setAccessToken(response.accessToken);
    setRefreshToken(response.refreshToken ?? null);
    const profile = await getProfile(response.accessToken);
    setUser(profile);
  };

  const login = async (payload: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const response = await loginRequest(payload);
      await applyAuthResponse(response);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: { name: string; email: string; phone?: string; password: string }) => {
    setIsLoading(true);
    try {
      const response = await registerRequest(payload);
      await applyAuthResponse(response);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    persistSession(null);
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setIsLoading(false);
  };

  const refreshProfile = async () => {
    if (!accessToken) return;

    setIsLoading(true);
    try {
      const profile = await getProfile(accessToken);
      setUser(profile);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const storedSession = readStoredSession();

      if (!storedSession?.accessToken) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      if (isMounted) {
        setAccessToken(storedSession.accessToken);
        setRefreshToken(storedSession.refreshToken ?? null);
      }

      try {
        const profile = await getProfile(storedSession.accessToken);
        if (isMounted) {
          setUser(profile);
        }
      } catch {
        persistSession(null);
        if (isMounted) {
          setUser(null);
          setAccessToken(null);
          setRefreshToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!accessToken) {
      setUser(null);
    }
  }, [accessToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        isAuthenticated: Boolean(user && accessToken),
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthProviderInner>{children}</AuthProviderInner>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
}
