'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { PRESET_AVATARS } from '@/lib/auth-types';
import { getLibraryItems, getAllProgress } from '@/lib/storage';
import { useStored } from '@/lib/useStored';
import MangaCard from '@/components/MangaCard';
import { IconBookmark, IconCheck, IconSettings } from '@/components/Icons';

export default function ProfilePage() {
  const { user, loading, updateProfile } = useAuth();
  const libraryItems = useStored(getLibraryItems, []);
  const historyMap = useStored(getAllProgress, {});

  const [activeTab, setActiveTab] = useState<'bookmarks' | 'history' | 'settings'>('bookmarks');
  const [bookmarkFilter, setBookmarkFilter] = useState<string>('all');

  // Edit profile state
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize form when user loads
  React.useEffect(() => {
    if (user) {
      setUsername(user.username);
      setBio(user.bio || '');
      setSelectedAvatar(user.avatar);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="container center-state" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
        Загрузка профиля…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container center-state" style={{ minHeight: '60vh' }}>
        <h2>Вы не авторизованы</h2>
        <p>Войдите в аккаунт, чтобы просматривать профиль, уровень и закладки.</p>
        <Link href="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          На главную
        </Link>
      </div>
    );
  }

  const expProgress =
    user.nextLevelExp > user.currentLevelExp
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(((user.exp - user.currentLevelExp) / (user.nextLevelExp - user.currentLevelExp)) * 100)
          )
        )
      : 100;

  const filteredBookmarks = libraryItems.filter(item => {
    if (bookmarkFilter === 'all') return true;
    return item.status === bookmarkFilter;
  });

  const historyList = Object.values(historyMap).sort((a, b) => b.updatedAt - a.updatedAt);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    const res = await updateProfile({
      username,
      bio,
      avatar: selectedAvatar,
    });

    setSaveLoading(false);
    if (res.ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setSaveError(res.error || 'Ошибка сохранения');
    }
  };

  return (
    <div className="profile-container container">
      {/* Profile Header (MangaLib style) */}
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar-box">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={user.avatar} alt={user.username} className="profile-avatar-img" />
            <span className="profile-level-badge">{user.level}</span>
          </div>

          <div className="profile-info">
            <div className="profile-name-row">
              <h1 className="profile-username">{user.username}</h1>
              <span className="profile-rank-chip">{user.rankTitle}</span>
              <span className="profile-level-chip">{user.level} ур.</span>
            </div>

            <p className="profile-bio">{user.bio || 'Пока нет статуса...'}</p>

            <div className="profile-exp-section">
              <div className="profile-exp-labels">
                <span>Прогресс уровня</span>
                <span>
                  {user.exp} / {user.nextLevelExp} EXP ({expProgress}%)
                </span>
              </div>
              <div className="exp-bar-container">
                <div className="exp-bar" style={{ width: `${expProgress}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="profile-stats-grid">
          <div className="profile-stat-box">
            <div className="stat-value">{libraryItems.length}</div>
            <div className="stat-label">В закладках</div>
          </div>
          <div className="profile-stat-box">
            <div className="stat-value">{historyList.length}</div>
            <div className="stat-label">Прочитано тайтлов</div>
          </div>
          <div className="profile-stat-box">
            <div className="stat-value">{user.exp}</div>
            <div className="stat-label">Всего EXP</div>
          </div>
          <div className="profile-stat-box">
            <div className="stat-value">{new Date(user.createdAt).toLocaleDateString('ru-RU')}</div>
            <div className="stat-label">Дата регистрации</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        <button
          className={`profile-tab-btn ${activeTab === 'bookmarks' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookmarks')}
        >
          <IconBookmark size={18} />
          Закладки ({libraryItems.length})
        </button>
        <button
          className={`profile-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          История чтения ({historyList.length})
        </button>
        <button
          className={`profile-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <IconSettings size={18} />
          Настройки профиля
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'bookmarks' && (
        <div className="profile-tab-content">
          <div className="filter-chips" style={{ marginBottom: '1.5rem' }}>
            <button
              className={`chip ${bookmarkFilter === 'all' ? 'active' : ''}`}
              onClick={() => setBookmarkFilter('all')}
            >
              Все ({libraryItems.length})
            </button>
            <button
              className={`chip ${bookmarkFilter === 'reading' ? 'active' : ''}`}
              onClick={() => setBookmarkFilter('reading')}
            >
              Читаю
            </button>
            <button
              className={`chip ${bookmarkFilter === 'planned' ? 'active' : ''}`}
              onClick={() => setBookmarkFilter('planned')}
            >
              В планах
            </button>
            <button
              className={`chip ${bookmarkFilter === 'completed' ? 'active' : ''}`}
              onClick={() => setBookmarkFilter('completed')}
            >
              Прочитано
            </button>
            <button
              className={`chip ${bookmarkFilter === 'dropped' ? 'active' : ''}`}
              onClick={() => setBookmarkFilter('dropped')}
            >
              Брошено
            </button>
          </div>

          {filteredBookmarks.length === 0 ? (
            <div className="center-state" style={{ minHeight: '30vh' }}>
              <p>В этой категории пока нет закладок</p>
              <Link href="/" className="btn btn-primary" style={{ marginTop: '0.75rem' }}>
                Перейти в каталог
              </Link>
            </div>
          ) : (
            <div className="manga-grid">
              {filteredBookmarks.map(item => (
                <MangaCard key={item.manga.id} manga={item.manga} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="profile-tab-content">
          {historyList.length === 0 ? (
            <div className="center-state" style={{ minHeight: '30vh' }}>
              <p>Вы ещё не начали читать тайтлы</p>
            </div>
          ) : (
            <div className="history-list">
              {historyList.map(h => (
                <div key={h.mangaId} className="history-card">
                  <div className="history-info">
                    <Link href={`/manga/${encodeURIComponent(h.mangaId)}`} className="history-title">
                      {h.mangaTitle || h.mangaId}
                    </Link>
                    <div className="history-chapter">
                      Глава {h.chapterNumber}: {h.chapterTitle || ''} (Стр. {h.pageIndex}/{h.totalPages})
                    </div>
                    <div className="history-date">
                      {new Date(h.updatedAt).toLocaleString('ru-RU')}
                    </div>
                  </div>
                  <Link
                    href={`/read/${encodeURIComponent(h.mangaId)}/${encodeURIComponent(h.chapterId)}`}
                    className="btn btn-primary btn-sm"
                  >
                    Продолжить
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="profile-tab-content">
          <form onSubmit={handleSaveProfile} className="settings-form">
            {saveSuccess && <div className="auth-success">Профиль успешно обновлён!</div>}
            {saveError && <div className="auth-error">{saveError}</div>}

            <div className="auth-field">
              <label>Никнейм</label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label>Статус / О себе</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Расскажите о любимых жанрах манхвы..."
                rows={3}
              />
            </div>

            <div className="auth-field">
              <label>Выберите аватар (MangaLib presets)</label>
              <div className="avatar-picker-grid">
                {PRESET_AVATARS.map(url => (
                  <button
                    key={url}
                    type="button"
                    className={`avatar-option ${selectedAvatar === url ? 'selected' : ''}`}
                    onClick={() => setSelectedAvatar(url)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="preset" />
                    {selectedAvatar === url && (
                      <span className="avatar-check">
                        <IconCheck size={14} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saveLoading} style={{ alignSelf: 'flex-start' }}>
              {saveLoading ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
