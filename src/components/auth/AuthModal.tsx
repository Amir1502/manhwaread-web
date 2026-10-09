'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { IconClose } from '@/components/Icons';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
}

export default function AuthModal({ isOpen, onClose, defaultTab = 'login' }: AuthModalProps) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>(defaultTab);

  // Form states
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await login(loginIdentifier, loginPassword);
    setLoading(false);
    if (res.ok) {
      onClose();
    } else {
      setError(res.error || 'Ошибка входа');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await register(regUsername, regEmail, regPassword);
    setLoading(false);
    if (res.ok) {
      onClose();
    } else {
      setError(res.error || 'Ошибка регистрации');
    }
  };

  return (
    <>
      <div className="backdrop" onClick={onClose} style={{ zIndex: 1000 }} />
      <div className="auth-modal" style={{ zIndex: 1001 }}>
        <button className="auth-modal-close" onClick={onClose} aria-label="Закрыть">
          <IconClose size={20} />
        </button>

        <div className="auth-modal-header">
          <div className="auth-logo">MR</div>
          <h3>Личный кабинет</h3>
          <p>Синхронизация закладок, уровни читателя и комментарии как на MangaLib</p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setTab('login');
              setError(null);
            }}
          >
            Вход
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setTab('register');
              setError(null);
            }}
          >
            Регистрация
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="auth-field">
              <label>Логин или Email</label>
              <input
                type="text"
                required
                value={loginIdentifier}
                onChange={e => setLoginIdentifier(e.target.value)}
                placeholder="Ваш ник или email"
                autoComplete="username"
              />
            </div>

            <div className="auth-field">
              <label>Пароль</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? 'Вход...' : 'Войти в аккаунт'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="auth-field">
              <label>Имя пользователя (Никнейм)</label>
              <input
                type="text"
                required
                minLength={3}
                value={regUsername}
                onChange={e => setRegUsername(e.target.value)}
                placeholder="OtakuReader"
                autoComplete="username"
              />
            </div>

            <div className="auth-field">
              <label>Электронная почта</label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                placeholder="reader@example.com"
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label>Пароль</label>
              <input
                type="password"
                required
                minLength={6}
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? 'Создание...' : 'Зарегистрироваться (+50 EXP)'}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
