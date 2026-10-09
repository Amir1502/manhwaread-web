'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LibraryItem, ReadingProgress, ReadingStatus } from '@/lib/types';
import { getLibraryItems, getAllProgress, removeLibraryItem, saveLibraryItem } from '@/lib/storage';

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ReadingProgress>>({});
  const [activeTab, setActiveTab] = useState<'all' | ReadingStatus | 'history'>('all');

  useEffect(() => {
    setItems(getLibraryItems());
    setProgressMap(getAllProgress());
  }, []);

  const handleRemove = (mangaId: string) => {
    const updated = removeLibraryItem(mangaId);
    setItems(updated);
  };

  const handleStatusChange = (item: LibraryItem, newStatus: ReadingStatus) => {
    const updated = saveLibraryItem(item.manga, newStatus);
    setItems(updated);
  };

  const filteredItems = items.filter(item => {
    if (activeTab === 'all' || activeTab === 'history') return true;
    return item.status === activeTab;
  });

  const historyEntries = Object.values(progressMap).sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem 5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Моя библиотека
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Ваши сохраненные манхвы, история и закладки глав
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        {[
          { id: 'all', label: `Все (${items.length})` },
          { id: 'reading', label: '📖 Читаю' },
          { id: 'planned', label: '⭐ В планах' },
          { id: 'completed', label: '✅ Прочитано' },
          { id: 'dropped', label: '🛑 Брошено' },
          { id: 'history', label: `🕒 История (${historyEntries.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`btn btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 'var(--radius-full)' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* History view */}
      {activeTab === 'history' ? (
        historyEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
            <h3>История чтения пуста</h3>
            <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>Откройте любую главу в каталоге, чтобы начать чтение</p>
            <Link href="/" className="btn btn-primary">Перейти в каталог</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {historyEntries.map(h => (
              <div
                key={`${h.mangaId}-${h.chapterId}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    Тайтл ID: {h.mangaId}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {h.chapterTitle || `Глава ${h.chapterNumber}`} • Страница {h.pageIndex} из {h.totalPages}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {new Date(h.updatedAt).toLocaleString('ru-RU')}
                  </div>
                </div>

                <Link href={`/read/${h.mangaId}/${h.chapterId}`} className="btn btn-primary btn-sm">
                  Продолжить чтение →
                </Link>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Library Bookmarks View */
        filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
            <h3>В этой категории пока ничего нет</h3>
            <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>Добавляйте понравившиеся тайтлы со страницы описания</p>
            <Link href="/" className="btn btn-primary">Исследовать каталог</Link>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            {filteredItems.map(item => {
              const mangaProgress = progressMap[item.manga.id];
              return (
                <div
                  key={item.manga.id}
                  style={{
                    display: 'flex',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-subtle)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <img
                    src={item.manga.coverUrl}
                    alt={item.manga.title}
                    style={{ width: '100px', height: '140px', objectFit: 'cover' }}
                  />

                  <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', flex: 1, gap: '0.4rem' }}>
                    <Link
                      href={`/manga/${item.manga.id}`}
                      style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3 }}
                      className="chapter-title"
                    >
                      {item.manga.title}
                    </Link>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {mangaProgress ? `Гл. ${mangaProgress.chapterNumber} (Стр. ${mangaProgress.pageIndex})` : 'Ещё не начато'}
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <select
                        value={item.status}
                        onChange={e => handleStatusChange(item, e.target.value as ReadingStatus)}
                        style={{
                          fontSize: '0.75rem',
                          background: 'rgba(255, 255, 255, 0.08)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="reading">Читаю</option>
                        <option value="planned">В планах</option>
                        <option value="completed">Прочитано</option>
                        <option value="dropped">Брошено</option>
                      </select>

                      <button
                        onClick={() => handleRemove(item.manga.id)}
                        style={{ fontSize: '0.75rem', color: '#EF4444', padding: '0.2rem 0.5rem' }}
                        title="Удалить из библиотеки"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
