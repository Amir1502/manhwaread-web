'use client';

import Link from 'next/link';
import { BookSummary } from '@/lib/books';
import { IconBookOpen, IconClock } from '@/components/Icons';

interface BookCardProps {
  book: BookSummary;
  onThemeClick?: (theme: string) => void;
}

export default function BookCard({ book, onThemeClick }: BookCardProps) {
  const getTagClass = (category: string) => {
    switch (category) {
      case 'Большое, но универсальное':
        return 'tag-large-universal';
      case 'Небольшое, но универсальное':
        return 'tag-small-universal';
      case 'Большое, но полезное':
        return 'tag-large-useful';
      default:
        return 'tag-small-universal';
    }
  };

  return (
    <article className="book-card">
      <div className="book-card-header">
        <span className={`book-card-tag ${getTagClass(book.category)}`}>
          {book.category}
        </span>
        <h3 className="book-card-title">
          <Link href={`/books/${book.id}`}>{book.title}</Link>
        </h3>
        <p className="book-card-author">{book.author}</p>
      </div>

      <div className="book-card-body">
        <p className="book-card-summary">{book.summary}</p>

        <div className="book-card-themes">
          {book.themes.map(t => (
            <button
              key={t}
              type="button"
              className="book-theme-pill"
              onClick={() => onThemeClick && onThemeClick(t)}
              title={`Фильтр по теме: ${t}`}
            >
              #{t}
            </button>
          ))}
        </div>

        <div className="book-card-meta">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <IconClock size={14} />
            {book.readTime}
          </span>
          <span>
            {book.totalChapters > 1 ? `${book.totalChapters} глав` : '1 глава'}
          </span>
        </div>

        <div className="book-card-actions">
          <Link href={`/books/${book.id}/read`} className="book-read-btn">
            <IconBookOpen size={16} />
            Читать
          </Link>
          <Link href={`/books/${book.id}`} className="book-details-btn">
            Шпаргалка
          </Link>
        </div>
      </div>
    </article>
  );
}
