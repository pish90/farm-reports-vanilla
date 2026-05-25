import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { setUnauthorizedHandler } from '../services/apiClient';
import { authService } from '../services/authService';
import type { CurrentUser } from '../types';

interface AuthState {
  user: CurrentUser | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true });

  const logout = useCallback(async () => {
    await authService.logout();
    setState({ user: null, isLoading: false });
  }, []);

  useEffect(() => { setUnauthorizedHandler(logout); }, [logout]);

  useEffect(() => {
    let active = true;
    async function restore() {
      const [ok, user] = await Promise.all([authService.isAuthenticated(), authService.getCurrentUser()]);
      if (active) setState({ user: ok ? user : null, isLoading: false });
    }
    restore();
    return () => { active = false; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await authService.login(email, password);
    const user = await authService.getCurrentUser();
    setState({ user, isLoading: false });
  }, []);

  const changePassword = useCallback(async (current: string, next: string) => {
    await authService.changePassword(current, next);
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
