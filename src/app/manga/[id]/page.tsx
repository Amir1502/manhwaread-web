'use client';

import Link from 'next/link';
import { use, useCallback, useMemo, useState } from 'react';
import CoverImage from '@/components/CoverImage';
import { IconCheck, IconExternal, IconPlay, IconSearch, IconSort, IconStar } from '@/components/Icons';
import { READING_STATUS_LABELS, SOURCE_LABELS, STATUS_LABELS, formatDate, plural } from '@/lib/labels';
import {
  getMangaLibraryStatus,
  getMangaProgress,
  getReadChapters,
  removeLibraryItem,
  saveLibraryItem,
} from '@/lib/storage';
import { ReadingStatus, SChapter, SManga } from '@/lib/types';
import { useApi } from '@/lib/useApi';
import { useStored } from '@/lib/useStored';
import CommentsSection from '@/components/comments/CommentsSection';

interface DetailsResponse {
  manga: SManga;
  chapters: SChapter[];
  chaptersError?: string;
}

const PAGE = 100;
const NO_READ: string[] = [];

export default function MangaDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params);
  const mangaId = decodeURIComponent(rawId);
  const { data, error, loading } = useApi<DetailsResponse>(`/api/manga/${encodeURIComponent(mangaId)}`);

  const libraryStatus = useStored(
    useCallback(() => getMangaLibraryStatus(mangaId), [mangaId]),
    null,
  );
  const progress = useStored(
    useCallback(() => getMangaProgress(mangaId), [mangaId]),
    null,
  );
  const readIds = useStored(
    useCallback(() => getReadChapters(mangaId), [mangaId]),
    NO_READ,
  );
  const readSet = useMemo(() => new Set(readIds), [readIds]);

  const [sortAsc, setSortAsc] = useState(false);
  const [filter, setFilter] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [expanded, setExpanded] = useState(false);

  const chapters = useMemo(() => data?.chapters ?? [], [data]);
  const visible = useMemo(() => {
    const ordered = sortAsc ? [...chapters].reverse() : chapters;
    const q = filter.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter(c => c.title.toLowerCase().includes(q) || String(c.number) === q);
  }, [chapters, sortAsc, filter]);

  if (loading) {
    return (
      <div className="center-state">
        <div className="spinner" />
        Загрузка тайтла…
      </div>
    );
  }

  if (error || !data?.manga) {
    return (
      <div className="center-state">
        <h2 style={{ color: 'var(--text-primary)' }}>Тайтл не найден</h2>
        {error && <p>{error}</p>}
        <Link href="/" className="btn btn-primary">
          Вернуться в каталог
        </Link>
      </div>
    );
  }

  const manga = data.manga;
  const first = chapters[chapters.length - 1];
  const progressChapter = progress ? chapters.find(c => c.id === progress.chapterId) : undefined;
  const continueTarget = progressChapter || first;
  const continueLabel = progressChapter ? `Продолжить: ${progressChapter.title.split(':')[0]}` : 'Начать читать';

  const onStatus = (value: string) => {
    if (value === 'remove') removeLibraryItem(manga.id);
    else saveLibraryItem(manga, value as ReadingStatus);
  };

  return (
    <div>
      <div className="detail-hero">
        {manga.coverUrl && <div className="detail-hero-bg" style={{ backgroundImage: `url("${manga.coverUrl}")` }} />}
        <div className="container">
          <div className="detail-content">
            <div className="detail-cover">
              <CoverImage src={manga.coverUrl} alt={manga.title} eager />
            </div>

            <div className="detail-info">
              <div className="chip-wrap">
                <span className="chip chip-accent">{SOURCE_LABELS[manga.sourceId] || manga.sourceId}</span>
                {manga.type && <span className="chip">{manga.type}</span>}
                <span className="chip">{STATUS_LABELS[manga.status]}</span>
                {manga.ageRating && (
                  <span className={`chip ${manga.isAdult ? 'chip-danger' : ''}`}>{manga.ageRating}</span>
                )}
              </div>

              <h1 className="detail-title">{manga.title}</h1>
              {manga.altTitle && <div className="detail-alt">{manga.altTitle}</div>}

              <div className="stats">
                {manga.rating > 0 && (
                  <div className="stat">
                    <b style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <IconStar size={16} style={{ color: 'var(--yellow)' }} />
                      {manga.rating.toFixed(1)}
                    </b>
                    <span>Рейтинг</span>
                  </div>
                )}
                <div className="stat">
                  <b>{chapters.length}</b>
                  <span>{plural(chapters.length, ['глава', 'главы', 'глав'])}</span>
                </div>
                {manga.authors.length > 0 && (
                  <div className="stat" style={{ minWidth: 0 }}>
                    <b style={{ fontSize: '0.95rem' }}>{manga.authors.slice(0, 3).join(', ')}</b>
                    <span>Авторы</span>
                  </div>
                )}
              </div>

              <div className="detail-actions">
                {continueTarget && (
                  <Link href={`/read/${manga.id}/${continueTarget.id}`} className="btn btn-primary">
                    <IconPlay size={16} />
                    {continueLabel}
                  </Link>
                )}
                <select
                  className="select"
                  value={libraryStatus || ''}
                  onChange={e => onStatus(e.target.value)}
                  aria-label="Статус в библиотеке"
                >
                  <option value="" disabled>
                    + В библиотеку
                  </option>
                  {(Object.keys(READING_STATUS_LABELS) as ReadingStatus[]).map(s => (
                    <option key={s} value={s}>
                      {READING_STATUS_LABELS[s]}
                    </option>
                  ))}
                  {libraryStatus && <option value="remove">Удалить из библиотеки</option>}
                </select>
                {manga.sourceUrl && (
                  <a href={manga.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                    <IconExternal size={16} /> На сайте
                  </a>
                )}
              </div>

              {manga.description && (
                <>
                  <p className={`description ${expanded ? '' : 'clamped'}`}>{manga.description}</p>
                  {manga.description.length > 280 && (
                    <button className="link-btn" onClick={() => setExpanded(v => !v)}>
                      {expanded ? 'Свернуть' : 'Подробнее'}
                    </button>
                  )}
                </>
              )}

              {manga.genres.length > 0 && (
                <div className="chip-wrap">
                  {manga.genres.slice(0, expanded ? undefined : 14).map(g => (
                    <span key={g} className="chip">
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="chapters-head">
          <div>
            <h2 className="section-title">Главы</h2>
            <div className="muted" style={{ fontSize: '0.84rem' }}>
              {readSet.size > 0 ? `Прочитано ${readSet.size} из ${chapters.length}` : `${chapters.length} всего`}
            </div>
          </div>
          <div className="filter-row">
            <label className="input-icon-wrap" style={{ minWidth: 200 }}>
              <IconSearch size={16} />
              <input
                className="input"
                placeholder="Номер или название"
                value={filter}
                onChange={e => {
                  setFilter(e.target.value);
                  setLimit(PAGE);
                }}
                style={{ padding: '0.55rem 0.9rem 0.55rem 2.4rem' }}
              />
            </label>
            <button className="btn btn-secondary btn-sm" onClick={() => setSortAsc(v => !v)}>
              <IconSort size={15} />
              {sortAsc ? 'Сначала старые' : 'Сначала новые'}
            </button>
          </div>
        </div>

        {data.chaptersError && <div className="notice error">Не удалось загрузить главы: {data.chaptersError}</div>}

        {visible.length === 0 ? (
          <div className="empty-state">
            <h3>{chapters.length === 0 ? 'Глав пока нет' : 'Главы не найдены'}</h3>
            {chapters.length === 0 && manga.sourceId === 'mangalib' && (
              <p>Возможно, тайтл лицензирован и закрыт на MangaLib без авторизации.</p>
            )}
            {chapters.length === 0 && manga.sourceId === 'comx' && (
              <div style={{ maxWidth: 480, margin: '0.75rem auto 0', textAlign: 'center' }}>
                <p className="muted" style={{ marginBottom: '1rem' }}>
                  Сервер Com-X.life временно ограничивает чтение глав для зарубежного хостинга. Вы можете открыть и читать этот тайтл прямо на источнике.
                </p>
                {manga.sourceUrl && (
                  <a
                    href={manga.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <IconExternal size={16} /> Читать на Com-X.life ↗
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="chapter-list">
            {visible.slice(0, limit).map(ch => {
              const isCurrent = progress?.chapterId === ch.id;
              const isRead = readSet.has(ch.id);
              return (
                <Link
                  key={ch.id}
                  href={`/read/${manga.id}/${ch.id}`}
                  className={`chapter-item ${isCurrent ? 'current' : ''} ${isRead ? 'read' : ''}`}
                  prefetch={false}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="chapter-title">{ch.title}</div>
                    {(ch.scanlationGroup || isCurrent) && (
                      <div className="chapter-sub">
                        {isCurrent && progress
                          ? `Вы здесь · стр. ${progress.pageIndex} из ${progress.totalPages}`
                          : ch.scanlationGroup}
                      </div>
                    )}
                  </div>
                  <div className="chapter-meta">
                    {ch.releaseDate && <span>{formatDate(ch.releaseDate)}</span>}
                    {isRead && <IconCheck size={16} style={{ color: 'var(--green)' }} />}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {visible.length > limit && (
          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <button className="btn btn-secondary" onClick={() => setLimit(l => l + PAGE * 3)}>
              Показать ещё ({visible.length - limit})
            </button>
          </div>
        )}

        <div style={{ marginTop: '3.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '2rem' }}>
          <CommentsSection mangaId={manga.id} chapterId="general" title="Обсуждение тайтла" />
        </div>
      </div>
    </div>
  );
}
