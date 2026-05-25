import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import type { CurrentUser } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api';
const TOKEN_KEY = 'auth_token';

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export const authService = {
  async login(email: string, password: string): Promise<void> {
    const res = await axios.post(`${API_URL}/auth/login`, { email, password });
    await AsyncStorage.setItem(TOKEN_KEY, res.data.token);
  },

  async logout(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },

  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },

  async getCurrentUser(): Promise<CurrentUser | null> {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const p = decodePayload(token);
    if (!p) return null;
    return {
      userId: Number(p.userId),
      name: String(p.name ?? ''),
      email: String(p.sub ?? ''),
      role: String(p.role ?? 'WORKER') as CurrentUser['role'],
    };
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    const p = decodePayload(token);
    if (!p?.exp) return false;
    return (p.exp as number) > Math.floor(Date.now() / 1000);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    await axios.put(
      `${API_URL}/auth/password`,
      { currentPassword, newPassword },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  },
};
