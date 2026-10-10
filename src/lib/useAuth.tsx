'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getLibraryItems, getAllProgress } from './storage';
import { PublicUser } from './auth-types';

export type AuthUser = PublicUser;

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (login: string, pass: string) => Promise<{ ok: boolean; error?: string }>;
  register: (username: string, pass: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: { username?: string; avatar?: string; bio?: string }) => Promise<{ ok: boolean; error?: string }>;
  gainExp: (amount: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const localToken = typeof window !== 'undefined' ? localStorage.getItem('mr_token') : null;
      const headers: Record<string, string> = {};
      if (localToken) {
        headers['Authorization'] = `Bearer ${localToken}`;
      }

      const res = await fetch('/api/auth/me', { headers });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Sync client bookmarks to server when logged in
  const syncWithServer = useCallback(async (expGain = 0) => {
    try {
      const localToken = typeof window !== 'undefined' ? localStorage.getItem('mr_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (localToken) {
        headers['Authorization'] = `Bearer ${localToken}`;
      }

      const bookmarks = getLibraryItems();
      const history = getAllProgress();
      const res = await fetch('/api/user/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({ bookmarks, history, expGain }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) setUser(data.user);
      }
    } catch {
      // ignore
    }
  }, []);

  const login = async (loginStr: string, pass: string) => {
    try {
      let backup: any = null;
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('mr_auth_backup');
        if (raw) {
          try { backup = JSON.parse(raw); } catch { /* ignore */ }
        }
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginStr, password: pass, backup }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Ошибка входа' };
      }
      setUser(data.user);
      if (typeof window !== 'undefined') {
        if (data.token) localStorage.setItem('mr_token', data.token);
        if (data.backup) localStorage.setItem('mr_auth_backup', JSON.stringify(data.backup));
      }
      // Auto-sync existing local bookmarks to the new account
      setTimeout(() => syncWithServer(10), 100);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Ошибка соединения с сервером' };
    }
  };

  const register = async (username: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Ошибка регистрации' };
      }
      setUser(data.user);
      if (typeof window !== 'undefined') {
        if (data.token) localStorage.setItem('mr_token', data.token);
        if (data.backup) localStorage.setItem('mr_auth_backup', JSON.stringify(data.backup));
      }
      setTimeout(() => syncWithServer(20), 100);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Ошибка соединения с сервером' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mr_token');
    }
    setUser(null);
  };

  const updateProfile = async (data: { username?: string; avatar?: string; bio?: string }) => {
    try {
      const localToken = typeof window !== 'undefined' ? localStorage.getItem('mr_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (localToken) {
        headers['Authorization'] = `Bearer ${localToken}`;
      }

      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error || 'Ошибка обновления' };
      setUser(json.user);
      if (typeof window !== 'undefined') {
        if (json.token) localStorage.setItem('mr_token', json.token);
        if (json.backup) localStorage.setItem('mr_auth_backup', JSON.stringify(json.backup));
      }
      return { ok: true };
    } catch {
      return { ok: false, error: 'Ошибка соединения' };
    }
  };

  const gainExp = async (amount: number) => {
    if (!user) return;
    await syncWithServer(amount);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        gainExp,
        refresh: fetchMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
