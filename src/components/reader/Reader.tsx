'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconChevronLeft, IconChevronRight, IconClose, IconList, IconSparkle } from '@/components/Icons';
import {
  ReaderSettings,
  DEFAULT_SETTINGS,
  getMangaProgress,
  getReaderSettings,
  markChapterRead,
  saveProgress,
  saveReaderSettings,
} from '@/lib/storage';
import { Page, SChapter, SManga } from '@/lib/types';
import { useApi } from '@/lib/useApi';
import { useStored } from '@/lib/useStored';
import BubbleLayer from './BubbleLayer';
import PageImage from './PageImage';

interface ChapterResponse {
  pages: Page[];
  manga: Pick<SManga, 'id' | 'title' | 'coverUrl' | 'sourceId' | 'type'> | null;
  prevChapter: SChapter | null;
  nextChapter: SChapter | null;
  currentChapter: SChapter | null;
  totalChapters: number;
}

const WIDTHS = [720, 900, 1200, 0];

export default function Reader({ mangaId, chapterId }: { mangaId: string; chapterId: string }) {
  const router = useRouter();
  const { data, error, loading } = useApi<ChapterResponse>(
    `/api/manga/${encodeURIComponent(mangaId)}/chapter/${encodeURIComponent(chapterId)}`,
  );
  const settings = useStored<ReaderSettings>(getReaderSettings, DEFAULT_SETTINGS);
  const saved = useStored(
    useCallback(() => {
      const p = getMangaProgress(mangaId);
      return p && p.chapterId === chapterId ? p.pageIndex : null;
    }, [mangaId, chapterId]),
    null,
  );

  const pages = useMemo(() => data?.pages ?? [], [data]);
  const total = pages.length;
  const [pageState, setPageState] = useState<number | null>(null);
  const page = Math.min(Math.max(pageState ?? saved ?? 1, 1), Math.max(total, 1));
  const [hud, setHud] = useState(true);
  const [toc, setToc] = useState(false);
  const [originals, setOriginals] = useState<Record<string, boolean>>({});
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const restored = useRef(false);
  const lastY = useRef(0);

  const mode = settings.mode;
  const hasOverlay = pages.some(p => p.overlay && p.overlay.bubbles.length > 0);
  const chapter = data?.currentChapter;
  const next = data?.nextChapter;
  const prev = data?.prevChapter;
  const base = `/read/${mangaId}`;

  // Restore scroll position in webtoon mode once pages are rendered (DOM side effect only).
  useEffect(() => {
    if (restored.current || total === 0) return;
    restored.current = true;
    if (mode === 'webtoon' && saved && saved > 1) {
      requestAnimationFrame(() => pageRefs.current[saved - 1]?.scrollIntoView({ block: 'start' }));
    } else {
      window.scrollTo(0, 0);
    }
  }, [total, mode, saved]);

  // Persist progress & read state.
  useEffect(() => {
    if (total === 0) return;
    saveProgress({
      mangaId,
      chapterId,
      chapterNumber: chapter?.number ?? 0,
      chapterTitle: chapter?.title,
      mangaTitle: data?.manga?.title,
      coverUrl: data?.manga?.coverUrl,
      pageIndex: page,
      totalPages: total,
      updatedAt: Date.now(),
    });
    if (page >= total) markChapterRead(mangaId, chapterId);
  }, [mangaId, chapterId, chapter, data?.manga, page, total]);

  // Webtoon: track current page & auto-hide HUD.
  useEffect(() => {
    if (mode !== 'webtoon' || total === 0) return;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY.current) > 50) {
        setHud(y < lastY.current || y < 80);
        lastY.current = y;
      }
      const mid = window.innerHeight / 2;
      for (let i = 0; i < pageRefs.current.length; i++) {
        const r = pageRefs.current[i]?.getBoundingClientRect();
        if (r && r.top <= mid && r.bottom >= mid) {
          setPageState(i + 1);
          break;
        }
      }
      if (window.innerHeight + y >= document.documentElement.scrollHeight - 300) setPageState(total);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [mode, total]);

  const goTo = useCallback(
    (n: number) => {
      const target = Math.min(Math.max(n, 1), total);
      setPageState(target);
      if (mode === 'webtoon') pageRefs.current[target - 1]?.scrollIntoView({ block: 'start' });
      else window.scrollTo(0, 0);
    },
    [mode, total],
  );

  const nextPage = useCallback(() => {
    if (page < total) goTo(page + 1);
    else if (next) router.push(`${base}/${next.id}`);
  }, [page, total, next, goTo, router, base]);

  const prevPage = useCallback(() => {
    if (page > 1) goTo(page - 1);
    else if (prev) router.push(`${base}/${prev.id}`);
  }, [page, prev, goTo, router, base]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'h' || e.key === 'H' || e.key === 'Р' || e.key === 'р') setHud(v => !v);
      if (e.key === 'Escape') setToc(false);
      if (mode !== 'paginated') return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevPage();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, nextPage, prevPage]);

  // Preload upcoming pages in paginated mode.
  useEffect(() => {
    if (mode !== 'paginated') return;
    pages.slice(page, page + 2).forEach(p => {
      const img = new Image();
      img.src = p.imageUrl;
    });
  }, [mode, page, pages]);

  const toggleBubble = useCallback((id: string) => setOriginals(o => ({ ...o, [id]: !o[id] })), []);

  if (loading) {
    return (
      <div className="reader center-state" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        Загрузка главы…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="reader center-state" style={{ minHeight: '100vh' }}>
        <h2 style={{ color: 'var(--text-primary)' }}>Не удалось открыть главу</h2>
        <p>{error}</p>
        <div className="hero-actions" style={{ justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>
            Повторить
          </button>
          <Link href={`/manga/${mangaId}`} className="btn btn-primary">
            К тайтлу
          </Link>
        </div>
      </div>
    );
  }

  const width = settings.maxWidth === 0 ? '100%' : `${settings.maxWidth}px`;
  const percent = total ? Math.round((page / total) * 100) : 0;
  const current = pages[page - 1];

  return (
    <div className="reader">
      <header className={`reader-hud top ${hud ? '' : 'hidden'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
          <Link
            href={`/manga/${mangaId}`}
            className="btn btn-ghost btn-sm btn-icon"
            title="К тайтлу"
            aria-label="К тайтлу"
          >
            <IconChevronLeft size={20} />
          </Link>
          <div className="reader-title">
            <b>{data.manga?.title || 'Назад'}</b>
            <span>{chapter?.title || `Глава ${chapterId}`}</span>
          </div>
        </div>
        <div className="reader-tools">
          {hasOverlay && (
            <button
              className={`btn btn-sm ${settings.aiOverlayEnabled ? 'btn-ai' : 'btn-secondary'}`}
              onClick={() => saveReaderSettings({ aiOverlayEnabled: !settings.aiOverlayEnabled })}
              title="Векторный AI-перевод бабблов"
            >
              <IconSparkle size={14} />
              <span className="hide-mobile">AI {settings.aiOverlayEnabled ? 'вкл' : 'выкл'}</span>
            </button>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => saveReaderSettings({ mode: mode === 'webtoon' ? 'paginated' : 'webtoon' })}
            title="Режим чтения"
          >
            {mode === 'webtoon' ? 'Вебтун' : 'Страницы'}
          </button>
          <button
            className="btn btn-secondary btn-sm hide-mobile"
            onClick={() =>
              saveReaderSettings({ maxWidth: WIDTHS[(WIDTHS.indexOf(settings.maxWidth) + 1) % WIDTHS.length] })
            }
            title="Ширина страницы"
          >
            {settings.maxWidth === 0 ? '100%' : `${settings.maxWidth}px`}
          </button>
          <button
            className="btn btn-secondary btn-sm btn-icon"
            onClick={() => setToc(true)}
            title="Оглавление"
            aria-label="Оглавление"
          >
            <IconList size={16} />
          </button>
        </div>
      </header>

      {mode === 'paginated' && total > 0 && (
        <>
          <div className="tap-zone left" onClick={prevPage} aria-hidden />
          <div className="tap-zone right" onClick={nextPage} aria-hidden />
        </>
      )}

      <main
        className="reader-content"
        style={{ maxWidth: width, gap: mode === 'webtoon' ? settings.pageGap : 0 }}
        onClick={() => setHud(v => !v)}
      >
        {total === 0 ? (
          <div className="center-state" style={{ minHeight: '100vh' }}>
            В главе нет страниц
          </div>
        ) : mode === 'webtoon' ? (
          pages.map((p, i) => (
            <div
              key={p.index}
              ref={el => void (pageRefs.current[i] = el)}
              className="page-wrapper"
              id={`page-${p.index}`}
            >
              <PageImage page={p} eager={i < 3} />
              {settings.aiOverlayEnabled && p.overlay && (
                <BubbleLayer overlay={p.overlay} originals={originals} onToggle={toggleBubble} />
              )}
            </div>
          ))
        ) : (
          current && (
            <div className="page-wrapper paged" key={current.index}>
              <div style={{ position: 'relative', lineHeight: 0, containerType: 'inline-size' }}>
                <PageImage page={current} eager />
                {settings.aiOverlayEnabled && current.overlay && (
                  <BubbleLayer overlay={current.overlay} originals={originals} onToggle={toggleBubble} />
                )}
              </div>
            </div>
          )
        )}

        {(mode === 'webtoon' || page >= total) && (
          <section className="chapter-end" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem' }}>{chapter ? `Конец: ${chapter.title}` : 'Конец главы'}</h3>
            <div className="hero-actions" style={{ justifyContent: 'center', marginTop: 0 }}>
              {prev && (
                <Link href={`${base}/${prev.id}`} className="btn btn-secondary">
                  ← Предыдущая
                </Link>
              )}
              <Link href={`/manga/${mangaId}`} className="btn btn-secondary">
                К оглавлению
              </Link>
              {next ? (
                <Link href={`${base}/${next.id}`} className="btn btn-primary">
                  Следующая глава →
                </Link>
              ) : (
                <span className="chip">Это последняя доступная глава</span>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className={`reader-hud bottom ${hud ? '' : 'hidden'}`}>
        <button
          className="btn btn-secondary btn-sm"
          disabled={!prev}
          onClick={() => prev && router.push(`${base}/${prev.id}`)}
          title="Предыдущая глава"
        >
          <IconChevronLeft size={16} />
          <span className="hide-mobile">Глава</span>
        </button>
        <div className="page-slider">
          <span>{page}</span>
          {total > 1 ? (
            <input
              type="range"
              min={1}
              max={total}
              value={page}
              onChange={e => goTo(Number(e.target.value))}
              aria-label="Страница"
            />
          ) : (
            <div className="progress-bar" style={{ flex: 1 }}>
              <div style={{ width: `${percent}%` }} />
            </div>
          )}
          <span>{total}</span>
        </div>
        <button
          className={`btn btn-sm ${next ? 'btn-primary' : 'btn-secondary'}`}
          disabled={!next}
          onClick={() => next && router.push(`${base}/${next.id}`)}
          title="Следующая глава"
        >
          <span className="hide-mobile">Глава</span>
          <IconChevronRight size={16} />
        </button>
      </footer>

      {toc && <TocPanel mangaId={mangaId} currentId={chapterId} onClose={() => setToc(false)} />}
    </div>
  );
}

function TocPanel({ mangaId, currentId, onClose }: { mangaId: string; currentId: string; onClose: () => void }) {
  const { data, loading } = useApi<{ chapters: SChapter[] }>(`/api/manga/${encodeURIComponent(mangaId)}`);
  const activeRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center' });
  }, [data]);
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <aside className="toc-panel" aria-label="Оглавление">
        <header>
          Оглавление
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} aria-label="Закрыть">
            <IconClose size={18} />
          </button>
        </header>
        <div className="toc-list">
          {loading && (
            <div className="center-state" style={{ minHeight: 200 }}>
              <div className="spinner" />
            </div>
          )}
          {data?.chapters.map(c => (
            <Link
              key={c.id}
              ref={c.id === currentId ? activeRef : undefined}
              href={`/read/${mangaId}/${c.id}`}
              className={c.id === currentId ? 'active' : ''}
              onClick={onClose}
            >
              {c.title}
            </Link>
          ))}
        </div>
      </aside>
    </>
  );
}
