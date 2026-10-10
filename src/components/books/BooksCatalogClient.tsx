'use client';

import { useState, useMemo } from 'react';
import { BookSummary } from '@/lib/books';
import BookCard from './BookCard';
import { IconSearch, IconClose, IconBook, IconSparkle } from '@/components/Icons';

interface BooksCatalogClientProps {
  initialBooks: BookSummary[];
  categories: string[];
  themes: string[];
}

export default function BooksCatalogClient({
  initialBooks,
  categories,
  themes,
}: BooksCatalogClientProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [selectedTheme, setSelectedTheme] = useState<string>('Все');

  const filteredBooks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialBooks.filter(b => {
      if (q) {
        const matchTitle = b.title.toLowerCase().includes(q);
        const matchAuthor = b.author.toLowerCase().includes(q);
        const matchSummary = b.summary.toLowerCase().includes(q);
        const matchTheme = b.themes.some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchAuthor && !matchSummary && !matchTheme) {
          return false;
        }
      }

      if (selectedCategory !== 'Все' && b.category !== selectedCategory) {
        return false;
      }

      if (selectedTheme !== 'Все' && !b.themes.includes(selectedTheme)) {
        return false;
      }

      return true;
    });
  }, [initialBooks, query, selectedCategory, selectedTheme]);

  const handleReset = () => {
    setQuery('');
    setSelectedCategory('Все');
    setSelectedTheme('Все');
  };

  const isFiltered = query !== '' || selectedCategory !== 'Все' || selectedTheme !== 'Все';

  return (
    <section>
      {/* Search and Filters */}
      <div className="books-filter-section">
        <div className="books-search-wrapper">
          <IconSearch className="books-search-icon" size={18} />
          <input
            type="text"
            className="books-search-input"
            placeholder="Поиск по названию книги, автору или направлению..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
              aria-label="Очистить поиск"
            >
              <IconClose size={16} />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="books-category-tabs" role="tablist">
          <button
            type="button"
            className={`books-tab-btn ${selectedCategory === 'Все' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('Все')}
          >
            Все произведения ({initialBooks.length})
          </button>
          {categories.map(c => {
            const count = initialBooks.filter(b => b.category === c).length;
            return (
              <button
                key={c}
                type="button"
                className={`books-tab-btn ${selectedCategory === c ? 'active' : ''}`}
                onClick={() => setSelectedCategory(c)}
              >
                {c} ({count})
              </button>
            );
          })}
        </div>

        {/* Thematic Chips */}
        <div className="books-theme-chips">
          <span className="books-theme-label">Направления:</span>
          <button
            type="button"
            className={`books-theme-chip ${selectedTheme === 'Все' ? 'active' : ''}`}
            onClick={() => setSelectedTheme('Все')}
          >
            Все темы
          </button>
          {themes.map(t => (
            <button
              key={t}
              type="button"
              className={`books-theme-chip ${selectedTheme === t ? 'active' : ''}`}
              onClick={() => setSelectedTheme(t === selectedTheme ? 'Все' : t)}
            >
              {t}
            </button>
          ))}
          {isFiltered && (
            <button
              type="button"
              onClick={handleReset}
              className="books-theme-chip"
              style={{ color: 'var(--accent-primary)', borderColor: 'rgba(255, 103, 64, 0.4)' }}
            >
              Сбросить фильтры ✕
            </button>
          )}
        </div>
      </div>

      {/* Results Count Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          fontSize: '0.9rem',
          color: 'var(--text-secondary)',
        }}
      >
        <span>
          Найдено произведений: <strong>{filteredBooks.length}</strong>
        </span>
        {isFiltered && (
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Фильтры активны
          </span>
        )}
      </div>

      {/* Books Grid or Empty State */}
      {filteredBooks.length > 0 ? (
        <div className="books-grid">
          {filteredBooks.map(b => (
            <BookCard
              key={b.id}
              book={b}
              onThemeClick={theme => setSelectedTheme(theme)}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: '4rem 1.5rem',
            textAlign: 'center',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: 'var(--text-muted)',
            }}
          >
            <IconBook size={28} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Ничего не найдено
          </h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
            По вашему запросу не найдено ни одного произведения. Попробуйте сбросить фильтры или ввести другое название.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="btn btn-primary"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
          >
            Показать все 21 книгу
          </button>
        </div>
      )}
    </section>
  );
}
