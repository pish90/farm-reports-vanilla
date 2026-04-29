import { createContext, useContext } from 'react';
import type { AuthUser } from '../types';

export interface AuthContextValue {
  user: AuthUser | null;
  login: (token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: () => {},
  logout: () => {},
});

export function useAuth() { return useContext(AuthContext); }

export function parseToken(token: string): AuthUser | null {
  try {
    const p = JSON.parse(atob(token.split('.')[1]));
    return { userId: p.userId, name: p.name, email: p.sub, role: p.role };
  } catch { return null; }
}
