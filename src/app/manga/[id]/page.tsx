'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { SManga, SChapter, ReadingStatus, ReadingProgress } from '@/lib/types';
import { getMangaLibraryStatus, saveLibraryItem, getMangaProgress } from '@/lib/storage';

export default function MangaDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const mangaId = resolvedParams.id;

  const [manga, setManga] = useState<SManga | null>(null);
  const [chapters, setChapters] = useState<SChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortAsc, setSortAsc] = useState(false);
  const [chapterFilter, setChapterFilter] = useState('');
  const [libraryStatus, setLibraryStatus] = useState<ReadingStatus | null>(null);
  const [progress, setProgress] = useState<ReadingProgress | null>(null);

  useEffect(() => {
    fetch(`/api/manga/${mangaId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setManga(data.manga);
          setChapters(data.chapters || []);
        }
      })
      .catch(err => console.error('Failed to load manga:', err))
      .finally(() => setLoading(false));

    // Client-side storage read
    setLibraryStatus(getMangaLibraryStatus(mangaId));
    setProgress(getMangaProgress(mangaId));
  }, [mangaId]);

  const handleStatusChange = (status: ReadingStatus) => {
    if (!manga) return;
    saveLibraryItem(manga, status);
    setLibraryStatus(status);
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Загрузка тайтла...</p>
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Тайтл не найден</h2>
        <Link href="/" className="btn btn-primary">Вернуться в каталог</Link>
      </div>
    );
  }

  const sortedChapters = [...chapters].sort((a, b) => {
    return sortAsc ? a.number - b.number : b.number - a.number;
  });

  const filteredChapters = sortedChapters.filter(ch => {
    if (!chapterFilter.trim()) return true;
    return ch.title.toLowerCase().includes(chapterFilter.toLowerCase()) || 
           ch.number.toString().includes(chapterFilter);
  });

  // Target chapter for continue reading
  const firstChapter = chapters.length > 0 ? chapters[chapters.length - 1] : null;
  const continueChapterId = progress?.chapterId || (firstChapter ? firstChapter.id : null);
  const continueText = progress ? `Продолжить: Гл. ${progress.chapterNumber}` : 'Начать читать';

  return (
    <div>
      {/* Blur Header Backdrop */}
      <div className="detail-backdrop">
        <img src={manga.coverUrl} alt="" className="detail-backdrop-image" />
        <div className="container">
          <div className="detail-content">
            {/* Cover Card */}
            <div className="detail-cover-box">
              <img src={manga.coverUrl} alt={manga.title} className="detail-cover-img" />
            </div>

            {/* Info Column */}
            <div className="detail-info">
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="chip chip-ai">
                  {manga.sourceId === 'curated' ? 'Векторный AI-оверлей' : 'MangaDex'}
                </span>
                <span className="chip" style={{ color: '#FACC15', fontWeight: 700 }}>
                  ★ {manga.rating.toFixed(1)}
                </span>
                <span className="chip">
                  {manga.status === 'COMPLETED' ? 'Завершён' : 'Онгоинг'}
                </span>
              </div>

              <h1 className="detail-title">{manga.title}</h1>
              {manga.altTitle && (
                <div className="detail-alt-title">{manga.altTitle}</div>
              )}

              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Авторы: <strong style={{ color: 'var(--text-primary)' }}>{manga.authors.join(', ')}</strong>
              </div>

              {/* Genre Chips */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {manga.genres.map(g => (
                  <span key={g} className="chip">{g}</span>
                ))}
              </div>

              {/* Description */}
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem', maxWidth: '780px' }}>
                {manga.description}
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                {continueChapterId && (
                  <Link href={`/read/${manga.id}/${continueChapterId}`} className="btn btn-primary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    {continueText}
                  </Link>
                )}

                {/* Library Status Selector */}
                <div style={{ position: 'relative' }}>
                  <select
                    className="btn btn-secondary"
                    value={libraryStatus || ''}
                    onChange={e => handleStatusChange(e.target.value as ReadingStatus)}
                    style={{ paddingRight: '2rem', cursor: 'pointer' }}
                  >
                    <option value="" disabled>+ Добавить в библиотеку</option>
                    <option value="reading">📖 Читаю</option>
                    <option value="planned">⭐ В планах</option>
                    <option value="completed">✅ Прочитано</option>
                    <option value="dropped">🛑 Брошено</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chapters Section */}
      <div className="container" style={{ padding: '2.5rem 1.25rem 5rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '1rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>
              Список глав ({chapters.length})
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Все главы доступны для онлайн-чтения
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Номер главы..."
              className="search-input"
              style={{ width: '150px', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
              value={chapterFilter}
              onChange={e => setChapterFilter(e.target.value)}
            />

            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="btn btn-secondary btn-sm"
              title="Переключить порядок"
            >
              {sortAsc ? 'Сначала старые ↑' : 'Сначала новые ↓'}
            </button>
          </div>
        </div>

        {/* Chapters list items */}
        <div className="chapter-list">
          {filteredChapters.length === 0 ? (
            <div style={{ padding: '2rem 0', color: 'var(--text-muted)', textAlign: 'center' }}>
              Главы не найдены
            </div>
          ) : (
            filteredChapters.map(ch => {
              const isCurrent = progress?.chapterId === ch.id;
              return (
                <Link
                  key={ch.id}
                  href={`/read/${manga.id}/${ch.id}`}
                  className="chapter-item"
                  style={{
                    borderColor: isCurrent ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    background: isCurrent ? 'rgba(255, 103, 64, 0.08)' : 'var(--bg-card)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {isCurrent && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)' }} />
                    )}
                    <span className="chapter-title">{ch.title}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {ch.releaseDate && (
                      <span className="chapter-date">{ch.releaseDate}</span>
                    )}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
