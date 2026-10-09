'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { SManga, SourceMeta } from '@/lib/types';
import MangaCard from '@/components/MangaCard';

export default function HomePage() {
  const [mangas, setMangas] = useState<SManga[]>([]);
  const [sources, setSources] = useState<SourceMeta[]>([]);
  const [selectedSource, setSelectedSource] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Все');
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const genres = ['Все', 'Экшен', 'Фэнтези', 'Система', 'Исекай', 'Приключения', 'Мурим', 'Комедия'];

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    const timer = setTimeout(() => {
      fetch(`/api/manga/browse?q=${encodeURIComponent(searchQuery)}&source=${selectedSource}`)
        .then(res => res.json())
        .then(data => {
          if (!isCancelled && data.success) {
            startTransition(() => {
              setMangas(data.mangas || []);
              if (data.sources) setSources(data.sources);
            });
          }
        })
        .catch(err => console.error('Fetch error:', err))
        .finally(() => {
          if (!isCancelled) setLoading(false);
        });
    }, searchQuery ? 300 : 0);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedSource]);

  const filteredMangas = mangas.filter(m => {
    if (selectedGenre === 'Все') return true;
    return m.genres.some(g => g.toLowerCase() === selectedGenre.toLowerCase());
  });

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      {/* Hero Section */}
      <section className="hero-banner">
        <div className="hero-glow-blob" />
        <div className="hero-glow-ai" />

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="chip chip-ai">⚡ AI OCR + Vector Typesetting</span>
          <span className="chip chip-accent">MangaDex v5 Connected</span>
        </div>

        <h1 className="hero-title">
          Полноценная читалка манхвы с <span>AI-векторным переводом</span>
        </h1>

        <p className="hero-desc">
          Читайте любимые манхвы и мангу в ультра-высоком качестве. 
          Фирменная технология векторного оверлея сохраняет идеальную резкость текста на любом зуме без запекания в растр.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <Link href="/read/solo-leveling/sl-ch-1" className="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Читать демо с AI-оверлеем
          </Link>
          <a href="#catalog" className="btn btn-secondary">
            Каталог тайтлов
          </a>
        </div>
      </section>

      {/* Catalog Search & Filters */}
      <section id="catalog">
        <div className="filter-bar">
          <div className="search-input-wrapper">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Поиск по названию или автору (например, Solo Leveling, Читатель...)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select
              className="source-select"
              value={selectedSource}
              onChange={e => setSelectedSource(e.target.value)}
            >
              {sources.length > 0 ? (
                sources.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="all">Все источники</option>
                  <option value="curated">ManhwaRead Топ (AI Оверлей)</option>
                  <option value="mangadex">MangaDex (API v5)</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Genre Chips */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          {genres.map(genre => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`chip ${selectedGenre === genre ? 'chip-accent' : ''}`}
              style={{
                cursor: 'pointer',
                borderColor: selectedGenre === genre ? 'var(--accent-primary)' : 'var(--border-subtle)',
                background: selectedGenre === genre ? 'var(--accent-glow)' : 'rgba(255, 255, 255, 0.04)',
                padding: '0.4rem 0.9rem',
                fontSize: '0.82rem'
              }}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Content Grid */}
        {loading ? (
          <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Загрузка каталога...</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Получение тайтлов из MangaDex & ManhwaRead Core</div>
          </div>
        ) : filteredMangas.length === 0 ? (
          <div style={{
            padding: '4rem 1rem',
            textAlign: 'center',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)'
          }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Тайтлы не найдены</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Попробуйте изменить поисковый запрос или переключить источник
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedGenre('Все'); setSelectedSource('all'); }}
              className="btn btn-secondary btn-sm"
            >
              Сбросить фильтры
            </button>
          </div>
        ) : (
          <div className="manga-grid">
            {filteredMangas.map(manga => (
              <MangaCard key={manga.id} manga={manga} />
            ))}
          </div>
        )}
      </section>

      {/* Tech Explainer Banner */}
      <section style={{
        marginTop: '4rem',
        padding: '2.5rem',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(17, 19, 26, 0.95) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="chip chip-ai">Технология Manhwaread</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Контракт OverlaySpec из Android-ядра</span>
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
          Как работает векторный перевод вместо мыльного растра?
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '850px' }}>
          В обычных читалках перевод «запекается» поверх оригинальных картинок, превращая текст в пиксели низкого разрешения.
          В архитектуре <strong>Manhwaread</strong> перевод хранится в виде спецификации векторных слоев (координаты баббла, маска, кегль, параметры шрифта) и рендерится поверх скана.
          Это дает кристальную четкость шрифта на любом дисплее и возможность переключать оригинал/перевод в один клик!
        </p>
      </section>
    </div>
  );
}
