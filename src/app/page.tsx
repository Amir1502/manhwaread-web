'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MangaCard, { MangaCardSkeleton } from '@/components/MangaCard';
import { IconClock, IconPlay, IconSearch, IconSparkle } from '@/components/Icons';
import { SOURCE_LABELS } from '@/lib/labels';
import { getAllProgress, getReaderSettings, saveReaderSettings } from '@/lib/storage';
import { SManga, SortMode, SourceMeta } from '@/lib/types';
import { useStored } from '@/lib/useStored';

interface BrowseResponse {
  mangas: SManga[];
  hasNextPage: boolean;
  errors?: Array<{ source: string; message: string }>;
  sources?: SourceMeta[];
}

interface CatalogState {
  key: string;
  items: SManga[];
  page: number;
  hasNext: boolean;
  loadingMore: boolean;
  error: string | null;
  errors: Array<{ source: string; message: string }>;
}

const DEFAULT_SOURCES: SourceMeta[] = [
  { id: 'all', name: 'Все источники', lang: 'ru', baseUrl: '', isOnline: true, supportsSearch: true },
  { id: 'mangalib', name: 'MangaLib', lang: 'ru', baseUrl: '', isOnline: true, supportsSearch: true },
  { id: 'remanga', name: 'ReManga', lang: 'ru', baseUrl: '', isOnline: true, supportsSearch: true },
  { id: 'mangamir', name: 'MangaMir', lang: 'ru', baseUrl: '', isOnline: true, supportsSearch: true },
  { id: 'mangadex', name: 'MangaDex', lang: 'ru/en', baseUrl: '', isOnline: true, supportsSearch: true },
];
const ADULT_SOURCE: SourceMeta = {
  id: 'manga18fx',
  name: 'Manga18fx (18+)',
  lang: 'en',
  baseUrl: '',
  isOnline: true,
  supportsSearch: true,
  isAdult: true,
};

const EMPTY_PROGRESS = {};
const getShowAdult = () => getReaderSettings().showAdult;

async function fetchPage(source: string, sort: SortMode, q: string, page: number, adult: boolean) {
  const qs = new URLSearchParams({ source, sort, q, page: String(page) });
  if (adult) qs.set('adult', '1');
  const res = await fetch(`/api/manga/browse?${qs}`);
  const json = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }));
  if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
  return json as BrowseResponse;
}

export default function HomePage() {
  const showAdult = useStored(getShowAdult, false);
  const progressMap = useStored(getAllProgress, EMPTY_PROGRESS as ReturnType<typeof getAllProgress>);
  const history = useMemo(
    () =>
      Object.values(progressMap)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 12),
    [progressMap],
  );

  const [source, setSource] = useState('all');
  const [sort, setSort] = useState<SortMode>('popular');
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQuery(input.trim()), 400);
    return () => clearTimeout(t);
  }, [input]);

  const effectiveSource = !showAdult && source === 'manga18fx' ? 'all' : source;
  const key = `${effectiveSource}|${sort}|${query}|${showAdult ? 1 : 0}`;
  const [state, setState] = useState<CatalogState | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPage(effectiveSource, sort, query, 1, showAdult)
      .then(r => {
        if (cancelled) return;
        setState({
          key,
          items: r.mangas,
          page: 1,
          hasNext: r.hasNextPage,
          loadingMore: false,
          error: null,
          errors: r.errors || [],
        });
      })
      .catch((e: Error) => {
        if (!cancelled)
          setState({ key, items: [], page: 1, hasNext: false, loadingMore: false, error: e.message, errors: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [key, effectiveSource, sort, query, showAdult]);

  const current = state && state.key === key ? state : null;
  const loading = !current;

  const loadMore = useCallback(() => {
    if (!current || !current.hasNext || current.loadingMore) return;
    const nextPage = current.page + 1;
    setState(s => (s && s.key === key ? { ...s, loadingMore: true } : s));
    fetchPage(effectiveSource, sort, query, nextPage, showAdult)
      .then(r =>
        setState(s => {
          if (!s || s.key !== key) return s;
          const seen = new Set(s.items.map(m => m.id));
          return {
            ...s,
            items: [...s.items, ...r.mangas.filter(m => !seen.has(m.id))],
            page: nextPage,
            hasNext: r.hasNextPage && r.mangas.length > 0,
            loadingMore: false,
          };
        }),
      )
      .catch(() => setState(s => (s && s.key === key ? { ...s, loadingMore: false, hasNext: false } : s)));
  }, [current, key, effectiveSource, sort, query, showAdult]);

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(entries => entries[0].isIntersecting && loadMore(), { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  const toggleAdult = () => {
    if (!showAdult && !window.confirm('Включить контент 18+? Подтвердите, что вам исполнилось 18 лет.')) return;
    saveReaderSettings({ showAdult: !showAdult });
  };

  const sources = showAdult ? [...DEFAULT_SOURCES, ADULT_SOURCE] : DEFAULT_SOURCES;

  return (
    <div className="container">
      <section className="hero">
        <div className="chip-wrap">
          <span className="chip chip-accent">MangaLib · ReManga · MangaMir · MangaDex</span>
          <span className="chip chip-ai">
            <IconSparkle size={13} /> Векторный AI-оверлей
          </span>
        </div>
        <h1>
          Вся манхва и манга — <em>в одной читалке</em>
        </h1>
        <p>
          Единый каталог популярных источников, библиотека со статусами, история чтения и удобная читалка: вебтун или
          постранично, с сохранением прогресса.
        </p>
        <div className="hero-actions">
          <a href="#catalog" className="btn btn-primary">
            <IconSearch size={17} /> Найти тайтл
          </a>
          <Link href="/read/demo~ai-overlay/ch-1" className="btn btn-secondary">
            <IconSparkle size={17} /> Демо AI-оверлея
          </Link>
        </div>
      </section>

      {history.length > 0 && (
        <section>
          <div className="section-head">
            <h2 className="section-title">Продолжить чтение</h2>
            <Link href="/library?tab=history" className="link-btn">
              Вся история →
            </Link>
          </div>
          <div className="continue-row">
            {history.map(h => (
              <Link key={h.mangaId} href={`/read/${h.mangaId}/${h.chapterId}`} className="continue-card">
                {h.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="thumb" src={h.coverUrl} alt="" loading="lazy" />
                ) : (
                  <div className="thumb" />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0, flex: 1 }}>
                  <b
                    style={{
                      fontSize: '0.9rem',
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h.mangaTitle || 'Без названия'}
                  </b>
                  <span
                    className="muted"
                    style={{ fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {h.chapterTitle || `Глава ${h.chapterNumber}`}
                  </span>
                  <div className="progress-bar" style={{ marginTop: 'auto' }}>
                    <div style={{ width: `${h.totalPages ? Math.round((h.pageIndex / h.totalPages) * 100) : 0}%` }} />
                  </div>
                  <span
                    className="muted"
                    style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <IconPlay size={10} /> стр. {h.pageIndex} из {h.totalPages}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section id="catalog" style={{ scrollMarginTop: 'var(--nav-h)' }}>
        <div className="filter-panel">
          <div className="filter-row">
            <label className="input-icon-wrap">
              <IconSearch />
              <input
                type="search"
                className="input"
                placeholder="Название на русском, английском или оригинальное…"
                value={input}
                onChange={e => setInput(e.target.value)}
                aria-label="Поиск"
              />
            </label>
            {!query && (
              <div className="segmented" role="tablist" aria-label="Сортировка">
                <button className={sort === 'popular' ? 'active' : ''} onClick={() => setSort('popular')}>
                  Популярное
                </button>
                <button className={sort === 'latest' ? 'active' : ''} onClick={() => setSort('latest')}>
                  <IconClock size={13} style={{ marginRight: 4, verticalAlign: '-2px' }} />
                  Обновления
                </button>
              </div>
            )}
            <button className={`switch ${showAdult ? 'on' : ''}`} onClick={toggleAdult} aria-pressed={showAdult}>
              <span className="switch-track" /> 18+
            </button>
          </div>
          <div className="chip-row">
            {sources.map(s => (
              <button
                key={s.id}
                className={`chip ${effectiveSource === s.id ? 'active' : ''}`}
                onClick={() => setSource(s.id)}
                style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {current && current.errors.length > 0 && (
          <div className="notice">
            Не ответили источники: {current.errors.map(e => SOURCE_LABELS[e.source] || e.source).join(', ')}. Показаны
            результаты остальных.
          </div>
        )}

        {loading ? (
          <div className="manga-grid">
            {Array.from({ length: 18 }, (_, i) => (
              <MangaCardSkeleton key={i} />
            ))}
          </div>
        ) : current.error ? (
          <div className="empty-state">
            <h3>Источник недоступен</h3>
            <p style={{ marginBottom: '1.25rem' }}>{current.error}</p>
            <button className="btn btn-secondary btn-sm" onClick={() => setSource('all')}>
              Показать все источники
            </button>
          </div>
        ) : current.items.length === 0 ? (
          <div className="empty-state">
            <h3>Ничего не найдено</h3>
            <p style={{ marginBottom: '1.25rem' }}>Попробуйте другое название или другой источник</p>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setInput('');
                setSource('all');
              }}
            >
              Сбросить фильтры
            </button>
          </div>
        ) : (
          <>
            <div className="manga-grid">
              {current.items.map((m, i) => (
                <MangaCard key={m.id} manga={m} eager={i < 12} />
              ))}
              {current.loadingMore && Array.from({ length: 6 }, (_, i) => <MangaCardSkeleton key={`s${i}`} />)}
            </div>
            <div ref={sentinel} style={{ height: 1 }} />
            {current.hasNext && !current.loadingMore && (
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button className="btn btn-secondary" onClick={loadMore}>
                  Показать ещё
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
