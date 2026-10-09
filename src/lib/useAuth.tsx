'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getLibraryItems, getAllProgress } from './storage';
import { PublicUser } from './auth-types';

export type AuthUser = PublicUser;

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (login: string, pass: string) => Promise<{ ok: boolean; error?: string }>;
  register: (username: string, email: string, pass: string) => Promise<{ ok: boolean; error?: string }>;
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
      const res = await fetch('/api/auth/me');
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
      const bookmarks = getLibraryItems();
      const history = getAllProgress();
      const res = await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginStr, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Ошибка входа' };
      }
      setUser(data.user);
      // Auto-sync existing local bookmarks to the new account
      setTimeout(() => syncWithServer(10), 100);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Ошибка соединения с сервером' };
    }
  };

  const register = async (username: string, email: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Ошибка регистрации' };
      }
      setUser(data.user);
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
    setUser(null);
  };

  const updateProfile = async (data: { username?: string; avatar?: string; bio?: string }) => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error || 'Ошибка обновления' };
      setUser(json.user);
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
