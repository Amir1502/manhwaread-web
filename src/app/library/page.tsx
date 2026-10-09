'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { IconPlay } from '@/components/Icons';
import { READING_STATUS_LABELS, SOURCE_LABELS, formatDate } from '@/lib/labels';
import { getAllProgress, getLibraryItems, removeLibraryItem, removeProgress, saveLibraryItem } from '@/lib/storage';
import { LibraryItem, ReadingProgress, ReadingStatus } from '@/lib/types';
import { useStored } from '@/lib/useStored';

type Tab = 'all' | ReadingStatus | 'history';
const NO_ITEMS: LibraryItem[] = [];
const NO_PROGRESS: Record<string, ReadingProgress> = {};

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="center-state">
          <div className="spinner" />
        </div>
      }
    >
      <Library />
    </Suspense>
  );
}

function Library() {
  const params = useSearchParams();
  const items = useStored(getLibraryItems, NO_ITEMS);
  const progressMap = useStored(getAllProgress, NO_PROGRESS);
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'history' ? 'history' : 'all');

  const history = useMemo(() => Object.values(progressMap).sort((a, b) => b.updatedAt - a.updatedAt), [progressMap]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of items) c[i.status] = (c[i.status] || 0) + 1;
    return c;
  }, [items]);
  const filtered = tab === 'all' || tab === 'history' ? items : items.filter(i => i.status === tab);

  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: 'all', label: 'Все', count: items.length },
    ...(Object.keys(READING_STATUS_LABELS) as ReadingStatus[]).map(s => ({
      id: s as Tab,
      label: READING_STATUS_LABELS[s],
      count: counts[s] || 0,
    })),
    { id: 'history', label: 'История', count: history.length },
  ];

  return (
    <div className="container">
      <div className="page-head">
        <h1>Моя библиотека</h1>
        <p className="secondary">Закладки, статусы и история чтения хранятся в этом браузере.</p>
      </div>

      <div className="tabs" role="tablist">
        {tabs.map(t => (
          <button key={t.id} role="tab" className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
            <span className="count">{t.count}</span>
          </button>
        ))}
      </div>

      {tab === 'history' ? (
        history.length === 0 ? (
          <Empty title="История чтения пуста" text="Откройте любую главу — прогресс сохранится автоматически." />
        ) : (
          <div className="list-grid">
            {history.map(h => (
              <div key={h.mangaId} className="list-card">
                <Link href={`/manga/${h.mangaId}`}>
                  {h.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={h.coverUrl} alt="" loading="lazy" />
                  ) : (
                    <div className="thumb" />
                  )}
                </Link>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: 0 }}>
                  <Link href={`/manga/${h.mangaId}`} style={{ fontWeight: 700, lineHeight: 1.3 }}>
                    {h.mangaTitle || h.mangaId}
                  </Link>
                  <span className="secondary" style={{ fontSize: '0.84rem' }}>
                    {h.chapterTitle || `Глава ${h.chapterNumber}`}
                  </span>
                  <div className="progress-bar">
                    <div style={{ width: `${h.totalPages ? Math.round((h.pageIndex / h.totalPages) * 100) : 0}%` }} />
                  </div>
                  <span className="muted" style={{ fontSize: '0.75rem' }}>
                    Стр. {h.pageIndex} из {h.totalPages} · {formatDate(new Date(h.updatedAt).toISOString())}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                    <Link href={`/read/${h.mangaId}/${h.chapterId}`} className="btn btn-primary btn-sm">
                      <IconPlay size={12} /> Продолжить
                    </Link>
                    <button className="btn btn-ghost btn-sm" onClick={() => removeProgress(h.mangaId)}>
                      Убрать
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <Empty title="Здесь пока пусто" text="Добавляйте тайтлы в библиотеку со страницы описания." />
      ) : (
        <div className="list-grid">
          {filtered.map(item => {
            const p = progressMap[item.manga.id];
            return (
              <div key={item.manga.id} className="list-card">
                <Link href={`/manga/${item.manga.id}`}>
                  {item.manga.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.manga.coverUrl} alt={item.manga.title} loading="lazy" />
                  ) : (
                    <div className="thumb" />
                  )}
                </Link>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: 0 }}>
                  <Link href={`/manga/${item.manga.id}`} style={{ fontWeight: 700, lineHeight: 1.3 }}>
                    {item.manga.title}
                  </Link>
                  <span className="muted" style={{ fontSize: '0.78rem' }}>
                    {[SOURCE_LABELS[item.manga.sourceId] || item.manga.sourceId, item.manga.type]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  <span className="secondary" style={{ fontSize: '0.82rem' }}>
                    {p
                      ? `${p.chapterTitle || `Глава ${p.chapterNumber}`} · стр. ${p.pageIndex}/${p.totalPages}`
                      : 'Ещё не начато'}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      marginTop: 'auto',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    {p && (
                      <Link href={`/read/${item.manga.id}/${p.chapterId}`} className="btn btn-primary btn-sm">
                        <IconPlay size={12} /> Читать
                      </Link>
                    )}
                    <select
                      className="select"
                      style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                      value={item.status}
                      onChange={e => saveLibraryItem(item.manga, e.target.value as ReadingStatus)}
                      aria-label="Статус"
                    >
                      {(Object.keys(READING_STATUS_LABELS) as ReadingStatus[]).map(s => (
                        <option key={s} value={s}>
                          {READING_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--red)' }}
                      onClick={() => removeLibraryItem(item.manga.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p style={{ marginBottom: '1.25rem' }}>{text}</p>
      <Link href="/" className="btn btn-primary">
        Перейти в каталог
      </Link>
    </div>
  );
}
