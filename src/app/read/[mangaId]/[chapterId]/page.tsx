'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { Page, SChapter, SManga } from '@/lib/types';
import { getReaderSettings, saveReaderSettings, saveProgress } from '@/lib/storage';

export default function ReaderPage({
  params
}: {
  params: Promise<{ mangaId: string; chapterId: string }>
}) {
  const resolvedParams = use(params);
  const { mangaId, chapterId } = resolvedParams;

  const [manga, setManga] = useState<SManga | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [currentChapter, setCurrentChapter] = useState<SChapter | null>(null);
  const [prevChapter, setPrevChapter] = useState<SChapter | null>(null);
  const [nextChapter, setNextChapter] = useState<SChapter | null>(null);
  const [loading, setLoading] = useState(true);

  // Reader Settings State
  const [mode, setMode] = useState<'webtoon' | 'paginated'>('webtoon');
  const [aiOverlay, setAiOverlay] = useState(true);
  const [maxWidth, setMaxWidth] = useState(900);
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const [hudVisible, setHudVisible] = useState(true);
  const [bubbleLanguageMode, setBubbleLanguageMode] = useState<Record<string, 'ru' | 'orig'>>({});

  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastScrollY = useRef(0);

  // Fetch Chapter Pages & Metadata
  useEffect(() => {
    setLoading(true);
    // Fetch chapter pages
    fetch(`/api/manga/${mangaId}/chapter/${chapterId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPages(data.pages || []);
          setCurrentChapter(data.currentChapter);
          setPrevChapter(data.prevChapter);
          setNextChapter(data.nextChapter);
        }
      })
      .catch(err => console.error('Failed to load chapter pages:', err))
      .finally(() => setLoading(false));

    // Fetch Manga title details
    fetch(`/api/manga/${mangaId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setManga(data.manga);
      });

    // Load initial settings
    const saved = getReaderSettings();
    setMode(saved.mode);
    setAiOverlay(saved.aiOverlayEnabled);
    setMaxWidth(saved.maxWidth);
  }, [mangaId, chapterId]);

  // Save Progress as user navigates
  useEffect(() => {
    if (!currentChapter || pages.length === 0) return;
    saveProgress({
      mangaId,
      chapterId,
      chapterNumber: currentChapter.number,
      chapterTitle: currentChapter.title,
      pageIndex: currentPageIndex,
      totalPages: pages.length,
      updatedAt: Date.now()
    });
  }, [mangaId, chapterId, currentChapter, currentPageIndex, pages.length]);

  // Handle scroll detection for Webtoon mode
  useEffect(() => {
    if (mode !== 'webtoon') return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Auto-hide HUD on scroll down, show on scroll up
      if (Math.abs(currentScrollY - lastScrollY.current) > 40) {
        if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
          setHudVisible(false);
        } else {
          setHudVisible(true);
        }
        lastScrollY.current = currentScrollY;
      }

      // Detect current visible page
      const viewportCenter = window.innerHeight / 2;
      for (let i = 0; i < pageRefs.current.length; i++) {
        const el = pageRefs.current[i];
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= viewportCenter && rect.bottom >= viewportCenter) {
            setCurrentPageIndex(i + 1);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mode]);

  // Keyboard navigation for Paginated Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        handleNextPage();
      } else if (e.key === 'ArrowLeft') {
        handlePrevPage();
      } else if (e.key === 'h' || e.key === 'H') {
        setHudVisible(v => !v);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPageIndex, pages.length, mode]);

  const handleNextPage = () => {
    if (currentPageIndex < pages.length) {
      const nextIdx = currentPageIndex + 1;
      setCurrentPageIndex(nextIdx);
      if (mode === 'webtoon' && pageRefs.current[nextIdx - 1]) {
        pageRefs.current[nextIdx - 1]?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 1) {
      const prevIdx = currentPageIndex - 1;
      setCurrentPageIndex(prevIdx);
      if (mode === 'webtoon' && pageRefs.current[prevIdx - 1]) {
        pageRefs.current[prevIdx - 1]?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const toggleOverlay = () => {
    const updated = !aiOverlay;
    setAiOverlay(updated);
    saveReaderSettings({ aiOverlayEnabled: updated });
  };

  const toggleMode = () => {
    const newMode = mode === 'webtoon' ? 'paginated' : 'webtoon';
    setMode(newMode);
    saveReaderSettings({ mode: newMode });
  };

  const cycleWidth = () => {
    const widths = [750, 950, 1200, 0];
    const nextWidth = widths[(widths.indexOf(maxWidth) + 1) % widths.length];
    setMaxWidth(nextWidth);
    saveReaderSettings({ maxWidth: nextWidth });
  };

  const toggleBubbleLang = (bubbleId: string) => {
    setBubbleLanguageMode(prev => ({
      ...prev,
      [bubbleId]: prev[bubbleId] === 'orig' ? 'ru' : 'orig'
    }));
  };

  if (loading) {
    return (
      <div className="reader-container" style={{ justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>Загрузка страниц главы...</p>
        <span className="chip chip-ai" style={{ marginTop: '1rem' }}>Инициализация AI OverlaySpec</span>
      </div>
    );
  }

  return (
    <div className="reader-container">
      {/* Top Floating HUD */}
      <header className={`reader-header ${hudVisible ? '' : 'hidden'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href={`/manga/${mangaId}`} className="btn btn-secondary btn-sm" title="Назад к тайтлу">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <span style={{ display: 'inline-block' }}>{manga?.title || 'Назад'}</span>
          </Link>

          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
            {currentChapter?.title || `Глава ${currentChapter?.number || ''}`}
          </span>
        </div>

        {/* Reader Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* AI Vector Overlay Toggle */}
          <button
            onClick={toggleOverlay}
            className={`btn btn-sm ${aiOverlay ? 'btn-ai' : 'btn-secondary'}`}
            title="Переключить векторный AI-перевод бабблов (без запекания в растр)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"/>
            </svg>
            AI Оверлей: {aiOverlay ? 'ВКЛ' : 'ВЫКЛ'}
          </button>

          {/* Mode Switcher */}
          <button
            onClick={toggleMode}
            className="btn btn-secondary btn-sm"
            title="Режим: Вебтун / Постранично"
          >
            {mode === 'webtoon' ? '📜 Вебтун' : '📖 Страницы'}
          </button>

          {/* Width Selector */}
          {mode === 'webtoon' && (
            <button
              onClick={cycleWidth}
              className="btn btn-secondary btn-sm"
              title="Ширина страницы"
            >
              {maxWidth === 0 ? '100%' : `${maxWidth}px`}
            </button>
          )}
        </div>
      </header>

      {/* Reader Content Pages */}
      <main
        className="reader-content"
        style={{
          maxWidth: maxWidth === 0 ? '100%' : `${maxWidth}px`,
          cursor: 'pointer'
        }}
        onClick={(e) => {
          // If clicked in bottom or top edge, toggle HUD
          const y = e.clientY;
          if (y < 120 || y > window.innerHeight - 120) {
            setHudVisible(v => !v);
          }
        }}
      >
        {mode === 'webtoon' ? (
          // Continuous Webtoon Vertical Scroll
          pages.map((page, idx) => (
            <div
              key={page.index}
              ref={el => { pageRefs.current[idx] = el; }}
              className="page-wrapper"
              id={`page-${page.index}`}
            >
              <img
                src={page.imageUrl}
                alt={`Страница ${page.index}`}
                className="page-image"
                loading={idx < 3 ? 'eager' : 'lazy'}
              />

              {/* Vector Speech Bubbles Overlay */}
              {aiOverlay && page.overlay && (
                <>
                  {page.overlay.bubbles.map(b => {
                    const isOrig = bubbleLanguageMode[b.id] === 'orig';
                    const textToShow = isOrig ? (b.originalText || b.translatedText) : b.translatedText;
                    return (
                      <div
                        key={b.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBubbleLang(b.id);
                        }}
                        className="bubble-overlay"
                        style={{
                          left: `${b.x * 100}%`,
                          top: `${b.y * 100}%`,
                          width: `${b.width * 100}%`,
                          height: `${b.height * 100}%`,
                          backgroundColor: b.backgroundColor || '#FFFFFF',
                          color: b.textColor || '#0B0C10',
                        }}
                        title="Нажмите, чтобы переключить оригинал/перевод"
                      >
                        <span
                          className="bubble-text"
                          style={{
                            fontSize: `${b.fontSize || 14}px`,
                            fontWeight: b.fontWeight || 'bold',
                            fontFamily: b.fontFamily || 'inherit',
                          }}
                        >
                          {textToShow}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          ))
        ) : (
          // Paginated Single Page Mode
          pages.length > 0 && (
            <div className="page-wrapper" style={{ minHeight: '80vh', alignItems: 'center' }}>
              {(() => {
                const currentPage = pages[currentPageIndex - 1] || pages[0];
                return (
                  <>
                    <img
                      src={currentPage.imageUrl}
                      alt={`Страница ${currentPage.index}`}
                      className="page-image"
                      onClick={handleNextPage}
                    />

                    {aiOverlay && currentPage.overlay && (
                      <>
                        {currentPage.overlay.bubbles.map(b => {
                          const isOrig = bubbleLanguageMode[b.id] === 'orig';
                          const textToShow = isOrig ? (b.originalText || b.translatedText) : b.translatedText;
                          return (
                            <div
                              key={b.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBubbleLang(b.id);
                              }}
                              className="bubble-overlay"
                              style={{
                                left: `${b.x * 100}%`,
                                top: `${b.y * 100}%`,
                                width: `${b.width * 100}%`,
                                height: `${b.height * 100}%`,
                                backgroundColor: b.backgroundColor || '#FFFFFF',
                                color: b.textColor || '#0B0C10',
                              }}
                              title="Клик: переключить оригинал/перевод"
                            >
                              <span
                                className="bubble-text"
                                style={{
                                  fontSize: `${b.fontSize || 14}px`,
                                  fontWeight: b.fontWeight || 'bold',
                                }}
                              >
                                {textToShow}
                              </span>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          )
        )}

        {/* End of Chapter Navigation Card */}
        <div style={{
          width: '100%',
          padding: '3rem 1.5rem',
          textAlign: 'center',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          marginTop: '2rem',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem'
        }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Конец главы {currentChapter?.number}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Прочитано: {pages.length} из {pages.length} страниц
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {prevChapter && (
              <Link href={`/read/${mangaId}/${prevChapter.id}`} className="btn btn-secondary">
                ← Пред. глава ({prevChapter.number})
              </Link>
            )}

            <Link href={`/manga/${mangaId}`} className="btn btn-secondary">
              К оглавлению тайтла
            </Link>

            {nextChapter && (
              <Link href={`/read/${mangaId}/${nextChapter.id}`} className="btn btn-primary">
                След. глава ({nextChapter.number}) →
              </Link>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Floating HUD */}
      <footer className={`reader-bottom-hud ${hudVisible ? '' : 'hidden'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {prevChapter ? (
            <Link href={`/read/${mangaId}/${prevChapter.id}`} className="btn btn-secondary btn-sm" title="Предыдущая глава">
              ← Гл. {prevChapter.number}
            </Link>
          ) : (
            <button disabled className="btn btn-secondary btn-sm" style={{ opacity: 0.4 }}>
              ← Пред
            </button>
          )}

          {mode === 'paginated' && (
            <button onClick={handlePrevPage} disabled={currentPageIndex <= 1} className="btn btn-secondary btn-sm">
              ‹ Стр
            </button>
          )}
        </div>

        {/* Page Progress Indicator & Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', minWidth: '160px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Стр. {currentPageIndex} из {pages.length}
          </span>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${pages.length > 0 ? (currentPageIndex / pages.length) * 100 : 0}%`,
                height: '100%',
                background: 'var(--accent-gradient)',
                transition: 'width 0.2s ease'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {mode === 'paginated' && (
            <button onClick={handleNextPage} disabled={currentPageIndex >= pages.length} className="btn btn-secondary btn-sm">
              Стр ›
            </button>
          )}

          {nextChapter ? (
            <Link href={`/read/${mangaId}/${nextChapter.id}`} className="btn btn-primary btn-sm" title="Следующая глава">
              Гл. {nextChapter.number} →
            </Link>
          ) : (
            <button disabled className="btn btn-secondary btn-sm" style={{ opacity: 0.4 }}>
              След →
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
