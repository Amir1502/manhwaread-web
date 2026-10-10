'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Book, BookChapter } from '@/lib/books';
import {
  IconChevronLeft,
  IconChevronRight,
  IconSettings,
  IconList,
  IconClose,
  IconBook,
  IconSparkle,
  IconEye,
  IconEyeOff,
  IconMaximize,
} from '@/components/Icons';

type ReaderTheme = 'dark' | 'oled' | 'sepia' | 'light';
type ReaderFontFamily = 'serif' | 'sans';

interface ReaderSettings {
  theme: ReaderTheme;
  fontSize: number; // in px: 15..26
  fontFamily: ReaderFontFamily;
  lineHeight: number; // 1.5, 1.75, 2.0
  maxWidth: number; // 680, 780, 920
}

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'dark',
  fontSize: 18,
  fontFamily: 'serif',
  lineHeight: 1.75,
  maxWidth: 780,
};

interface BookReaderClientProps {
  book: Book;
  initialChapterIndex?: number;
}

export default function BookReaderClient({
  book,
  initialChapterIndex = 0,
}: BookReaderClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Determine current chapter from query string or prop
  const chParam = searchParams.get('ch');
  const parsedCh = chParam ? parseInt(chParam, 10) - 1 : initialChapterIndex;
  const validInitialIndex =
    !isNaN(parsedCh) && parsedCh >= 0 && parsedCh < book.chapters.length
      ? parsedCh
      : 0;

  const [currentChapterIdx, setCurrentChapterIdx] = useState<number>(validInitialIndex);
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [hud, setHud] = useState(true);
  const lastScrollY = useRef(0);

  // Sync state if URL query param changes
  useEffect(() => {
    if (chParam) {
      const idx = parseInt(chParam, 10) - 1;
      if (!isNaN(idx) && idx >= 0 && idx < book.chapters.length) {
        setCurrentChapterIdx(idx);
      }
    }
  }, [chParam, book.chapters.length]);

  // Load settings and reading progress from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('book_reader_settings');
      if (savedSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      }

      // If no ?ch= was specified in URL, check saved progress
      if (!chParam) {
        const savedProgress = localStorage.getItem(`book_progress_${book.id}`);
        if (savedProgress) {
          const pIdx = parseInt(savedProgress, 10);
          if (!isNaN(pIdx) && pIdx >= 0 && pIdx < book.chapters.length) {
            setCurrentChapterIdx(pIdx);
          }
        }
      }
    } catch {
      // Ignore storage errors in private mode
    }
  }, [book.id, chParam, book.chapters.length]);

  // Save settings when changed
  const updateSettings = (newPartial: Partial<ReaderSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newPartial };
      try {
        localStorage.setItem('book_reader_settings', JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  };

  // Switch chapter
  const goToChapter = (idx: number) => {
    if (idx < 0 || idx >= book.chapters.length) return;
    setCurrentChapterIdx(idx);
    setIsTocOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update URL query and save progress
    router.replace(`/books/${book.id}/read?ch=${idx + 1}`, { scroll: false });
    try {
      localStorage.setItem(`book_progress_${book.id}`, idx.toString());
    } catch {
      // Ignore
    }
  };

  // Auto-hide HUD on scroll down, reveal on scroll up
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const diff = y - lastScrollY.current;
      if (Math.abs(diff) > 50) {
        if (diff > 0 && y > 80) {
          // Scrolling down - hide HUD
          setHud(false);
          setIsSettingsOpen(false);
          setIsTocOpen(false);
        } else if (diff < 0) {
          // Scrolling up - show HUD
          setHud(true);
        }
        lastScrollY.current = y;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    } catch {}
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowLeft') {
        if (currentChapterIdx > 0) goToChapter(currentChapterIdx - 1);
      } else if (e.key === 'ArrowRight') {
        if (currentChapterIdx < book.chapters.length - 1) goToChapter(currentChapterIdx + 1);
      } else if (e.key === 'Escape') {
        if (isSettingsOpen || isTocOpen) {
          setIsSettingsOpen(false);
          setIsTocOpen(false);
        } else {
          setHud(prev => !prev);
        }
      } else if (e.key === 'h' || e.key === 'H' || e.key === 'р' || e.key === 'Р') {
        setHud(prev => !prev);
      } else if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentChapterIdx, book.chapters.length, isSettingsOpen, isTocOpen]);

  // Click on background or reading area toggles HUD
  const handleContentClick = (e: React.MouseEvent) => {
    // If text was selected (e.g. for copying quotes), don't toggle
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) return;

    // If clicking an interactive button or panel, don't toggle
    const target = e.target as HTMLElement | null;
    if (
      target?.closest(
        'button, a, input, select, .reader-settings-panel, .reader-drawer, .reader-header, .reader-footer'
      )
    ) {
      return;
    }

    setHud(prev => !prev);
    setIsSettingsOpen(false);
  };

  const currentChapter: BookChapter =
    book.chapters[currentChapterIdx] ||
    book.chapters[0] || {
      id: 'ch-1',
      title: 'Текст произведения',
      content: [],
    };

  const totalChapters = book.chapters.length;
  const progressPercent = Math.round(((currentChapterIdx + 1) / totalChapters) * 100);

  const getThemeClass = (theme: ReaderTheme) => {
    switch (theme) {
      case 'oled':
        return 'reader-theme-oled';
      case 'sepia':
        return 'reader-theme-sepia';
      case 'light':
        return 'reader-theme-light';
      default:
        return 'reader-theme-dark';
    }
  };

  const getFontFamilyStyle = (font: ReaderFontFamily) => {
    if (font === 'serif') {
      return 'var(--font-reader-serif, "Charter", "Bitstream Charter", "Georgia", "Cambria", "Times New Roman", serif)';
    }
    return 'var(--font-reader-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)';
  };

  return (
    <div
      className={`book-reader-root ${getThemeClass(settings.theme)}`}
      onClick={handleContentClick}
    >
      {/* Floating Zen Mode Restore Button */}
      {!hud && (
        <button
          type="button"
          className="reader-zen-hint"
          onClick={e => {
            e.stopPropagation();
            setHud(true);
          }}
          title="Показать меню (нажмите в любом месте или H)"
        >
          <IconEye size={14} />
          <span>Меню</span>
        </button>
      )}

      {/* Sticky Reader Navigation Bar */}
      <header className={`reader-header ${hud ? '' : 'hidden'}`}>
        <div className="reader-header-left">
          <Link
            href={`/books/${book.id}`}
            className="reader-btn"
            title="Назад к карточке книги и шпаргалке"
          >
            <IconChevronLeft size={16} />
            <span>К книге</span>
          </Link>
          <div style={{ marginLeft: '0.25rem' }}>
            <div className="reader-header-title">{book.title}</div>
            <div className="reader-header-subtitle">
              {book.author} · {currentChapter.title}
            </div>
          </div>
        </div>

        <div className="reader-header-right">
          {/* Zen Mode Button */}
          <button
            type="button"
            className="reader-btn"
            onClick={e => {
              e.stopPropagation();
              setHud(false);
              setIsSettingsOpen(false);
              setIsTocOpen(false);
            }}
            title="Скрыть панели (только текст)"
          >
            <IconEyeOff size={16} />
            <span>Только текст</span>
          </button>

          {/* TOC Drawer Toggle Button */}
          {totalChapters > 1 && (
            <button
              type="button"
              className={`reader-btn ${isTocOpen ? 'active' : ''}`}
              onClick={e => {
                e.stopPropagation();
                setIsTocOpen(prev => !prev);
                setIsSettingsOpen(false);
              }}
              title="Оглавление"
            >
              <IconList size={16} />
              <span>Главы ({currentChapterIdx + 1}/{totalChapters})</span>
            </button>
          )}

          {/* Settings Button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={`reader-btn ${isSettingsOpen ? 'active' : ''}`}
              onClick={() => {
                setIsSettingsOpen(prev => !prev);
                setIsTocOpen(false);
              }}
              title="Настройки чтения (шрифт, тема)"
            >
              <IconSettings size={16} />
              <span>Шрифт</span>
            </button>

            {/* Settings Popover */}
            {isSettingsOpen && (
              <div className="reader-settings-panel">
                {/* Theme Selector */}
                <div className="settings-group">
                  <span className="settings-label">Тема оформления</span>
                  <div className="settings-theme-options">
                    <button
                      type="button"
                      className={`settings-theme-btn ${settings.theme === 'dark' ? 'active' : ''}`}
                      style={{ background: '#13141c', color: '#e5e7eb' }}
                      onClick={() => updateSettings({ theme: 'dark' })}
                    >
                      Тёмная
                    </button>
                    <button
                      type="button"
                      className={`settings-theme-btn ${settings.theme === 'oled' ? 'active' : ''}`}
                      style={{ background: '#000000', color: '#ffffff' }}
                      onClick={() => updateSettings({ theme: 'oled' })}
                    >
                      OLED
                    </button>
                    <button
                      type="button"
                      className={`settings-theme-btn ${settings.theme === 'sepia' ? 'active' : ''}`}
                      style={{ background: '#f7efe2', color: '#3b2e2a' }}
                      onClick={() => updateSettings({ theme: 'sepia' })}
                    >
                      Сепия
                    </button>
                    <button
                      type="button"
                      className={`settings-theme-btn ${settings.theme === 'light' ? 'active' : ''}`}
                      style={{ background: '#ffffff', color: '#1a1a1a' }}
                      onClick={() => updateSettings({ theme: 'light' })}
                    >
                      Светлая
                    </button>
                  </div>
                </div>

                {/* Font Family */}
                <div className="settings-group">
                  <span className="settings-label">Гарнитура шрифта</span>
                  <div className="settings-font-options">
                    <button
                      type="button"
                      className={`settings-font-btn ${settings.fontFamily === 'serif' ? 'active' : ''}`}
                      style={{ fontFamily: 'Georgia, serif' }}
                      onClick={() => updateSettings({ fontFamily: 'serif' })}
                    >
                      С засечками
                    </button>
                    <button
                      type="button"
                      className={`settings-font-btn ${settings.fontFamily === 'sans' ? 'active' : ''}`}
                      style={{ fontFamily: 'system-ui, sans-serif' }}
                      onClick={() => updateSettings({ fontFamily: 'sans' })}
                    >
                      Без засечек
                    </button>
                  </div>
                </div>

                {/* Font Size */}
                <div className="settings-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="settings-label">Размер текста</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{settings.fontSize} px</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="reader-btn"
                      style={{ flex: 1 }}
                      disabled={settings.fontSize <= 14}
                      onClick={() => updateSettings({ fontSize: Math.max(14, settings.fontSize - 1) })}
                    >
                      А-
                    </button>
                    <button
                      type="button"
                      className="reader-btn"
                      style={{ flex: 1 }}
                      disabled={settings.fontSize >= 26}
                      onClick={() => updateSettings({ fontSize: Math.min(26, settings.fontSize + 1) })}
                    >
                      А+
                    </button>
                  </div>
                </div>

                {/* Width */}
                <div className="settings-group">
                  <span className="settings-label">Ширина полосы</span>
                  <div className="settings-font-options">
                    <button
                      type="button"
                      className={`settings-font-btn ${settings.maxWidth === 680 ? 'active' : ''}`}
                      onClick={() => updateSettings({ maxWidth: 680 })}
                    >
                      Узкая
                    </button>
                    <button
                      type="button"
                      className={`settings-font-btn ${settings.maxWidth === 780 ? 'active' : ''}`}
                      onClick={() => updateSettings({ maxWidth: 780 })}
                    >
                      Стандарт
                    </button>
                    <button
                      type="button"
                      className={`settings-font-btn ${settings.maxWidth === 920 ? 'active' : ''}`}
                      onClick={() => updateSettings({ maxWidth: 920 })}
                    >
                      Широкая
                    </button>
                  </div>
                </div>

                {/* Reading Mode */}
                <div className="settings-group">
                  <span className="settings-label">Режим чтения</span>
                  <div className="settings-font-options">
                    <button
                      type="button"
                      className="settings-font-btn"
                      onClick={() => {
                        setHud(false);
                        setIsSettingsOpen(false);
                      }}
                      title="Скрыть верхнюю и нижнюю панели"
                    >
                      <IconEyeOff size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                      Только текст
                    </button>
                    <button
                      type="button"
                      className="settings-font-btn"
                      onClick={toggleFullscreen}
                      title="Полноэкранный режим (F)"
                    >
                      <IconMaximize size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                      На весь экран
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Text Reading Container */}
      <main
        className="reader-body"
        style={{
          maxWidth: `${settings.maxWidth}px`,
          fontSize: `${settings.fontSize}px`,
          fontFamily: getFontFamilyStyle(settings.fontFamily),
          lineHeight: settings.lineHeight,
        }}
      >
        <h1 className="reader-chapter-title">{currentChapter.title}</h1>

        <div className="reader-text-content">
          {currentChapter.content.map((paragraph, idx) => (
            <p key={idx} className="reader-paragraph">
              {paragraph}
            </p>
          ))}
        </div>
      </main>

      {/* Sticky Reader Footer Bar */}
      <footer className={`reader-footer ${hud ? '' : 'hidden'}`}>
        <button
          type="button"
          className="reader-btn"
          disabled={currentChapterIdx <= 0}
          onClick={() => goToChapter(currentChapterIdx - 1)}
          style={{ opacity: currentChapterIdx <= 0 ? 0.4 : 1, cursor: currentChapterIdx <= 0 ? 'not-allowed' : 'pointer' }}
        >
          <IconChevronLeft size={16} />
          <span>Предыдущая глава</span>
        </button>

        <div className="reader-progress-info">
          Глава {currentChapterIdx + 1} из {totalChapters} ({progressPercent}%)
        </div>

        {currentChapterIdx < totalChapters - 1 ? (
          <button
            type="button"
            className="reader-btn"
            onClick={() => goToChapter(currentChapterIdx + 1)}
          >
            <span>Следующая глава</span>
            <IconChevronRight size={16} />
          </button>
        ) : (
          <Link
            href={`/books/${book.id}`}
            className="reader-btn active"
            style={{ textDecoration: 'none' }}
          >
            <IconSparkle size={15} />
            <span>Шпаргалка к сочинению</span>
          </Link>
        )}
      </footer>

      {/* TOC Drawer Overlay */}
      {isTocOpen && (
        <div
          className="reader-drawer-overlay"
          onClick={() => setIsTocOpen(false)}
        />
      )}

      {/* TOC Slide-in Drawer */}
      {isTocOpen && (
        <aside className="reader-drawer" aria-label="Оглавление">
          <div className="reader-drawer-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IconBook size={18} />
              <span className="reader-drawer-title">Оглавление</span>
            </div>
            <button
              type="button"
              className="reader-btn"
              style={{ padding: '0.35rem' }}
              onClick={() => setIsTocOpen(false)}
              aria-label="Закрыть оглавление"
            >
              <IconClose size={16} />
            </button>
          </div>

          <div className="reader-drawer-list">
            {book.chapters.map((ch, idx) => (
              <button
                key={ch.id || idx}
                type="button"
                className={`reader-drawer-item ${idx === currentChapterIdx ? 'active' : ''}`}
                onClick={() => goToChapter(idx)}
              >
                <div style={{ fontWeight: idx === currentChapterIdx ? 700 : 500 }}>
                  {ch.title}
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '2px' }}>
                  {ch.content?.length || 0} абзацев
                </div>
              </button>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
