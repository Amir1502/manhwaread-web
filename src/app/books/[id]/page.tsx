import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBookById } from '@/lib/books';
import {
  IconBook,
  IconBookOpen,
  IconClock,
  IconSparkle,
  IconChevronRight,
} from '@/components/Icons';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const book = getBookById(id);
  if (!book) {
    return {
      title: 'Книга не найдена | ManhwaRead',
    };
  }

  return {
    title: `${book.title} — ${book.author} | Итоговое сочинение 11 класса`,
    description: `Читать произведение «${book.title}» (${book.author}) онлайн. Готовые аргументы к итоговому сочинению, тезисы, ключевые цитаты по направлениям: ${book.themes.join(', ')}.`,
  };
}

export default async function BookDetailPage({ params }: PageProps) {
  const { id } = await params;
  const book = getBookById(id);

  if (!book) {
    notFound();
  }

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
    <div>
      {/* Top Header & Breadcrumbs */}
      <section className="book-detail-header">
        <div className="book-detail-inner">
          <nav className="book-breadcrumbs" aria-label="Хлебные крошки">
            <Link href="/books">Библиотека книг</Link>
            <IconChevronRight size={14} />
            <span>{book.title}</span>
          </nav>

          <div className="book-hero-main">
            <div>
              <span className={`book-card-tag ${getTagClass(book.category)}`}>
                {book.category}
              </span>
              <h1 className="book-title-large">{book.title}</h1>
              <p className="book-author-large">
                {book.author} {book.year ? `(${book.year})` : ''}
              </p>
            </div>

            <div className="book-quick-stats">
              <div className="book-quick-stat-item">
                <IconClock size={16} />
                <span>
                  Время чтения: <strong>{book.readTime}</strong>
                </span>
              </div>
              <div className="book-quick-stat-item">
                <IconBookOpen size={16} />
                <span>
                  Слов: <strong>~{book.totalWords.toLocaleString('ru-RU')}</strong>
                </span>
              </div>
              <div className="book-quick-stat-item">
                <IconBook size={16} />
                <span>
                  Глав: <strong>{book.totalChapters}</strong>
                </span>
              </div>
              <div className="book-quick-stat-item">
                <IconSparkle size={16} />
                <span>
                  Аргументов: <strong>{book.essayArguments?.length || 0}</strong>
                </span>
              </div>
            </div>

            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 840 }}>
              {book.summary}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', marginTop: '0.5rem' }}>
              <Link
                href={`/books/${book.id}/read`}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.85rem 1.75rem',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <IconBookOpen size={20} />
                Читать онлайн
              </Link>
              {book.chapters.length > 1 && (
                <a
                  href="#chapters"
                  className="btn btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.85rem 1.4rem',
                    fontSize: '1rem',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  Оглавление ({book.chapters.length} глав)
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="books-container" style={{ paddingTop: 0 }}>
        {/* Cheatsheet for Russian Final Essay */}
        <section className="cheatsheet-card">
          <div className="cheatsheet-badge">
            <IconSparkle size={14} />
            <span>Шпаргалка к итоговому сочинению (11 класс)</span>
          </div>

          <h2 className="cheatsheet-title">Направления ФИПИ и литературные аргументы</h2>
          <p className="cheatsheet-subtitle">
            Готовые аргументы и сцены из произведения «{book.title}» для обоснования тезисов
            в экзаменационном сочинении.
          </p>

          {/* FIPI Directions & Themes Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.75rem' }}>
            {book.fipiDirections.map(d => (
              <span
                key={d}
                style={{
                  background: 'rgba(139, 92, 246, 0.15)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  padding: '0.35rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                {d}
              </span>
            ))}
            {book.themes.map(t => (
              <span
                key={t}
                style={{
                  background: 'rgba(255, 103, 64, 0.12)',
                  color: 'var(--accent-primary)',
                  border: '1px solid rgba(255, 103, 64, 0.25)',
                  padding: '0.35rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}
              >
                #{t}
              </span>
            ))}
          </div>

          {/* Argument Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {book.essayArguments?.map((arg, idx) => (
              <div key={idx} className="argument-card">
                <span className="argument-theme-badge">{arg.theme}</span>
                <h3 className="argument-thesis">{arg.thesis}</h3>
                <p className="argument-body">{arg.argument}</p>
              </div>
            ))}
          </div>

          {/* Quotes Section */}
          {book.keyQuotes && book.keyQuotes.length > 0 && (
            <div className="quotes-section">
              <h3 className="quotes-title">Цитаты для запоминания и использования:</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {book.keyQuotes.map((q, idx) => (
                  <blockquote key={idx} className="quote-bubble">
                    «{q}»
                  </blockquote>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Table of Contents Section */}
        <section id="chapters" className="toc-section">
          <h2 className="toc-title">
            Оглавление {book.chapters.length > 1 ? `(${book.chapters.length} глав)` : ''}
          </h2>

          <div className="toc-list">
            {book.chapters.map((ch, idx) => (
              <Link
                key={ch.id || idx}
                href={`/books/${book.id}/read?ch=${idx + 1}`}
                className="toc-item"
              >
                <span>{ch.title}</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {ch.content?.length || 0} абз. →
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
