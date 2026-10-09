'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import AuthModal from './AuthModal';
import { IconBookmark } from '@/components/Icons';

export default function UserMenu() {
  const { user, loading, logout } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return <div className="user-menu-loading" />;
  }

  if (!user) {
    return (
      <>
        <button
          type="button"
          className="btn btn-primary btn-sm user-login-btn"
          onClick={() => setModalOpen(true)}
        >
          Войти
        </button>
        <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  const expProgress = user.nextLevelExp > user.currentLevelExp
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(((user.exp - user.currentLevelExp) / (user.nextLevelExp - user.currentLevelExp)) * 100)
        )
      )
    : 100;

  return (
    <div className="user-menu-wrapper" ref={menuRef}>
      <button
        type="button"
        className="user-avatar-trigger"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Профиль пользователя"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatar} alt={user.username} className="user-avatar-img" />
        <span className="user-level-badge">{user.level}</span>
      </button>

      {menuOpen && (
        <div className="user-dropdown-menu">
          <div className="user-dropdown-header">
            <div className="user-dropdown-name">{user.username}</div>
            <div className="user-dropdown-rank">
              <span className="rank-badge">{user.rankTitle}</span>
              <span className="level-text">{user.level} уровень</span>
            </div>
            <div className="exp-bar-container">
              <div className="exp-bar" style={{ width: `${expProgress}%` }} />
            </div>
            <div className="exp-text">
              {user.exp} / {user.nextLevelExp} EXP
            </div>
          </div>

          <div className="user-dropdown-links">
            <Link
              href="/profile"
              className="user-dropdown-item"
              onClick={() => setMenuOpen(false)}
            >
              Мой профиль
            </Link>
            <Link
              href="/library"
              className="user-dropdown-item"
              onClick={() => setMenuOpen(false)}
            >
              <IconBookmark size={16} />
              Закладки
            </Link>
          </div>

          <div className="user-dropdown-footer">
            <button
              type="button"
              className="user-dropdown-logout"
              onClick={async () => {
                setMenuOpen(false);
                await logout();
              }}
            >
              Выйти
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
