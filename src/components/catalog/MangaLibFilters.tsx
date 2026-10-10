'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SortMode, SortOrder, CatalogFilters } from '@/lib/types';
import { IconChevronDown, IconClose, IconFilter, IconSort } from '@/components/Icons';

export const MANGALIB_SORT_OPTIONS: Array<{ id: SortMode; label: string }> = [
  { id: 'popular', label: 'По популярности' },
  { id: 'rating', label: 'По рейтингу' },
  { id: 'views', label: 'По просмотрам' },
  { id: 'chapters', label: 'Количеству глав' },
  { id: 'release_date', label: 'Дате релиза' },
  { id: 'latest', label: 'Дате обновления' },
  { id: 'created', label: 'Дате добавления' },
  { id: 'name_asc', label: 'По названию (A-Z)' },
  { id: 'name_ru_asc', label: 'По названию (А-Я)' },
];

export const MANGALIB_TYPES = ['Манхва', 'Маньхуа', 'Манга', 'Руманга', 'Комикс', 'OEL-манга'];

export const MANGALIB_FORMATS = ['Вебтун', 'В цвете', '4-кома (Ёнкома)', 'Сборник', 'Додзинси', 'Сингл', 'Веб'];

export const MANGALIB_STATUSES = [
  { id: 'ONGOING', label: 'Онгоинг' },
  { id: 'COMPLETED', label: 'Завершён' },
  { id: 'HIATUS', label: 'Приостановлен' },
  { id: 'CANCELLED', label: 'Выпуск прекращён' },
];

export const MANGALIB_TRANSLATION_STATUSES = ['Продолжается', 'Завершён', 'Заморожен', 'Заброшен'];

export const MANGALIB_AGE_RATINGS = ['6+', '12+', '16+', '18+'];

export const MANGALIB_GENRES = [
  'Сёнен',
  'Романтика',
  'Боевик',
  'Приключения',
  'Фэнтези',
  'Драма',
  'Комедия',
  'Сверхъестественное',
  'Исекай',
  'Повседневность',
  'Триллер',
  'Ужасы',
  'Мистика',
  'Психология',
  'Этти',
  'Гарем',
  'Киберпанк',
  'Спорт',
  'Меха',
  'Сэйнэн',
  'Сёдзё',
  'Школа',
  'Детектив',
];

export const MANGALIB_TAGS = [
  'Система',
  'Культивация',
  'Реинкарнация',
  'Магия',
  'Подземелья',
  'Ранги',
  'Монстры',
  'Видеоигры',
  'ГГ мужчина',
  'ГГ женщина',
  'Месть',
  'Выживание',
  'Умный ГГ',
  'Боги',
  'Гильдии',
  'Демоны',
  'Духи',
  'Зомби',
  'Средневековье',
];

export const MANGALIB_MY_LISTS = [
  { id: 'reading', label: 'Читаю' },
  { id: 'planned', label: 'В планах' },
  { id: 'favorites', label: 'Любимые' },
  { id: 'completed', label: 'Прочитано' },
  { id: 'dropped', label: 'Брошено' },
];

interface MangaLibFiltersProps {
  sort: SortMode;
  setSort: (s: SortMode) => void;
  sortOrder: SortOrder;
  setSortOrder: (o: SortOrder) => void;
  filters: CatalogFilters;
  setFilters: React.Dispatch<React.SetStateAction<CatalogFilters>>;
  onApply: () => void;
  onReset: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  activeCount: number;
}

export function MangaLibSortDropdown({
  sort,
  setSort,
  sortOrder,
  setSortOrder,
}: {
  sort: SortMode;
  setSort: (s: SortMode) => void;
  sortOrder: SortOrder;
  setSortOrder: (o: SortOrder) => void;
}) {
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortDropdownOpen(false);
      }
    }
    if (sortDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sortDropdownOpen]);

  const currentSortLabel = useMemo(() => {
    const item = MANGALIB_SORT_OPTIONS.find(s => s.id === sort);
    return item ? item.label : 'По популярности';
  }, [sort]);

  return (
    <div className="ml-sort-wrapper" ref={sortRef}>
      <button
        type="button"
        className="ml-sort-btn"
        onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
        aria-expanded={sortDropdownOpen}
      >
        <IconSort size={15} />
        <span>{currentSortLabel}</span>
        <IconChevronDown size={14} className={sortDropdownOpen ? 'rotated' : ''} />
      </button>

      {sortDropdownOpen && (
        <div className="ml-sort-popover">
          <div className="ml-sort-section">
            {MANGALIB_SORT_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                className={`ml-sort-item ${sort === opt.id ? 'active' : ''}`}
                onClick={() => {
                  setSort(opt.id);
                  setSortDropdownOpen(false);
                }}
              >
                <span className="ml-radio">
                  <span className="ml-radio-inner" />
                </span>
                <span className="ml-sort-text">{opt.label}</span>
              </button>
            ))}
          </div>

          <div className="ml-sort-divider" />

          <div className="ml-sort-section">
            <button
              type="button"
              className={`ml-sort-item ${sortOrder === 'desc' ? 'active' : ''}`}
              onClick={() => {
                setSortOrder('desc');
                setSortDropdownOpen(false);
              }}
            >
              <span className="ml-radio">
                <span className="ml-radio-inner" />
              </span>
              <span className="ml-sort-text">По убыванию</span>
            </button>
            <button
              type="button"
              className={`ml-sort-item ${sortOrder === 'asc' ? 'active' : ''}`}
              onClick={() => {
                setSortOrder('asc');
                setSortDropdownOpen(false);
              }}
            >
              <span className="ml-radio">
                <span className="ml-radio-inner" />
              </span>
              <span className="ml-sort-text">По возрастанию</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function MangaLibSidebar({
  filters,
  setFilters,
  onApply,
  onReset,
  sidebarOpen,
  setSidebarOpen,
}: {
  filters: CatalogFilters;
  setFilters: React.Dispatch<React.SetStateAction<CatalogFilters>>;
  onApply: () => void;
  onReset: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
}) {
  const toggleArrayItem = (key: keyof CatalogFilters, item: string) => {
    setFilters(prev => {
      const current = (prev[key] as string[]) || [];
      const updated = current.includes(item) ? current.filter(x => x !== item) : [...current, item];
      return { ...prev, [key]: updated };
    });
  };

  return (
    <>
      {/* Backdrop for mobile drawer */}
      {sidebarOpen && <div className="ml-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      {/* Filter Sidebar / Drawer */}
      <aside className={`ml-filters-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="ml-filters-header">
          <h3>Фильтры</h3>
          <button
            type="button"
            className="ml-filters-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Закрыть фильтры"
          >
            <IconClose size={18} />
          </button>
        </div>

        <div className="ml-filters-body">
          {/* 1. Жанры */}
          <div className="ml-filter-group">
            <h4 className="ml-filter-title">Жанры</h4>
            <div className="ml-chips-wrap">
              {MANGALIB_GENRES.map(g => {
                const active = filters.genres?.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    className={`ml-filter-chip ${active ? 'active' : ''}`}
                    onClick={() => toggleArrayItem('genres', g)}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Теги */}
          <div className="ml-filter-group">
            <h4 className="ml-filter-title">Теги</h4>
            <div className="ml-chips-wrap">
              {MANGALIB_TAGS.map(t => {
                const active = filters.tags?.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    className={`ml-filter-chip ${active ? 'active' : ''}`}
                    onClick={() => toggleArrayItem('tags', t)}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Числовые диапазоны */}
          <div className="ml-filter-group">
            <h4 className="ml-filter-title">Количество глав</h4>
            <div className="ml-range-row">
              <input
                type="number"
                placeholder="От"
                min={0}
                className="ml-input-num"
                value={filters.minChapters ?? ''}
                onChange={e =>
                  setFilters(p => ({
                    ...p,
                    minChapters: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))
                }
              />
              <span className="ml-range-sep">—</span>
              <input
                type="number"
                placeholder="До"
                min={0}
                className="ml-input-num"
                value={filters.maxChapters ?? ''}
                onChange={e =>
                  setFilters(p => ({
                    ...p,
                    maxChapters: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))
                }
              />
            </div>
          </div>

          <div className="ml-filter-group">
            <h4 className="ml-filter-title">Год релиза</h4>
            <div className="ml-range-row">
              <input
                type="number"
                placeholder="От"
                min={1970}
                max={2030}
                className="ml-input-num"
                value={filters.minYear ?? ''}
                onChange={e =>
                  setFilters(p => ({
                    ...p,
                    minYear: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))
                }
              />
              <span className="ml-range-sep">—</span>
              <input
                type="number"
                placeholder="До"
                min={1970}
                max={2030}
                className="ml-input-num"
                value={filters.maxYear ?? ''}
                onChange={e =>
                  setFilters(p => ({
                    ...p,
                    maxYear: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  }))
                }
              />
            </div>
          </div>

          <div className="ml-filter-group">
            <h4 className="ml-filter-title">Оценка</h4>
            <div className="ml-range-row">
              <input
                type="number"
                step="0.1"
                placeholder="От 0"
                min={0}
                max={10}
                className="ml-input-num"
                value={filters.minRating ?? ''}
                onChange={e =>
                  setFilters(p => ({
                    ...p,
                    minRating: e.target.value ? parseFloat(e.target.value) : undefined,
                  }))
                }
              />
              <span className="ml-range-sep">—</span>
              <input
                type="number"
                step="0.1"
                placeholder="До 10"
                min={0}
                max={10}
                className="ml-input-num"
                value={filters.maxRating ?? ''}
                onChange={e =>
                  setFilters(p => ({
                    ...p,
                    maxRating: e.target.value ? parseFloat(e.target.value) : undefined,
                  }))
                }
              />
            </div>
          </div>

          {/* 4. Возрастной рейтинг */}
          <div className="ml-filter-group">
            <h4 className="ml-filter-title">Возрастной рейтинг</h4>
            <div className="ml-checkbox-grid">
              {MANGALIB_AGE_RATINGS.map(ar => (
                <label key={ar} className="ml-checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.ageRatings?.includes(ar) || false}
                    onChange={() => toggleArrayItem('ageRatings', ar)}
                  />
                  <span className="ml-custom-checkbox" />
                  <span>{ar}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 5. Тип */}
          <div className="ml-filter-group">
            <h4 className="ml-filter-title">Тип</h4>
            <div className="ml-checkbox-grid">
              {MANGALIB_TYPES.map(t => (
                <label key={t} className="ml-checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.types?.includes(t) || false}
                    onChange={() => toggleArrayItem('types', t)}
                  />
                  <span className="ml-custom-checkbox" />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 6. Формат выпуска */}
          <div className="ml-filter-group">
            <h4 className="ml-filter-title">Формат выпуска</h4>
            <div className="ml-checkbox-grid">
              {MANGALIB_FORMATS.map(f => (
                <label key={f} className="ml-checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.formats?.includes(f) || false}
                    onChange={() => toggleArrayItem('formats', f)}
                  />
                  <span className="ml-custom-checkbox" />
                  <span>{f}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 7. Статус тайтла */}
          <div className="ml-filter-group">
            <h4 className="ml-filter-title">Статус тайтла</h4>
            <div className="ml-checkbox-grid">
              {MANGALIB_STATUSES.map(s => (
                <label key={s.id} className="ml-checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.status?.includes(s.id) || false}
                    onChange={() => toggleArrayItem('status', s.id)}
                  />
                  <span className="ml-custom-checkbox" />
                  <span>{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 8. Мои списки */}
          <div className="ml-filter-group">
            <h4 className="ml-filter-title">Мои списки</h4>
            <div className="ml-checkbox-grid">
              {MANGALIB_MY_LISTS.map(l => (
                <label key={l.id} className="ml-checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.myLists?.includes(l.id) || false}
                    onChange={() => toggleArrayItem('myLists', l.id)}
                  />
                  <span className="ml-custom-checkbox" />
                  <span>{l.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="ml-filters-footer">
          <button type="button" className="btn btn-secondary ml-reset-btn" onClick={onReset}>
            Сбросить
          </button>
          <button
            type="button"
            className="btn btn-primary ml-apply-btn"
            onClick={() => {
              onApply();
              if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                setSidebarOpen(false);
              }
            }}
          >
            Применить
          </button>
        </div>
      </aside>
    </>
  );
}

export default function MangaLibFilters({
  sort,
  setSort,
  sortOrder,
  setSortOrder,
  filters,
  setFilters,
  onApply,
  onReset,
  sidebarOpen,
  setSidebarOpen,
}: MangaLibFiltersProps) {
  return (
    <>
      <MangaLibSortDropdown sort={sort} setSort={setSort} sortOrder={sortOrder} setSortOrder={setSortOrder} />
      <MangaLibSidebar
        filters={filters}
        setFilters={setFilters}
        onApply={onApply}
        onReset={onReset}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
    </>
  );
}

