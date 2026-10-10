import { Metadata } from 'next';
import { getAllBooksSummary, getAllCategories, getAllThemes } from '@/lib/books';
import BooksCatalogClient from '@/components/books/BooksCatalogClient';
import { IconSparkle, IconBook, IconClock } from '@/components/Icons';

export const metadata: Metadata = {
  title: 'Книги для Итогового сочинения 11 класса | Читать онлайн',
  description:
    'Полная библиотека произведений для Итогового сочинения по русскому языку в 11 классе (ФИПИ). Тексты без сокращений для чтения онлайн, готовые аргументы и тезисы.',
};

export default function BooksPage() {
  const books = getAllBooksSummary();
  const categories = getAllCategories();
  const themes = getAllThemes();

  const totalArguments = books.reduce((acc, b) => acc + (b.argumentsCount || 0), 0);

  return (
    <main className="books-container">
      {/* Hero Header */}
      <section className="books-hero">
        <div className="books-badge">
          <IconSparkle size={14} />
          <span>11 класс · Итоговое сочинение 2026 · ФИПИ</span>
        </div>

        <h1 className="books-hero-title">
          Библиотека для <span>Итогового сочинения</span>
        </h1>

        <p className="books-hero-desc">
          21 ключевое произведение: от небольших универсальных рассказов на 15–30 минут
          до фундаментальной классики. Полные тексты для чтения онлайн, структурированные тезисы,
          литературные аргументы и банк цитат для каждого направления.
        </p>

        <div className="books-hero-stats">
          <div className="books-stat-chip">
            <IconBook size={16} />
            <span>
              <strong>{books.length}</strong> произведений
            </span>
          </div>
          <div className="books-stat-chip">
            <IconSparkle size={16} />
            <span>
              <strong>{totalArguments}</strong> аргументов ФИПИ
            </span>
          </div>
          <div className="books-stat-chip">
            <IconClock size={16} />
            <span>
              <strong>Удобная читалка</strong> со шрифтами и темами
            </span>
          </div>
        </div>
      </section>

      {/* Catalog with search & filters */}
      <BooksCatalogClient
        initialBooks={books}
        categories={categories}
        themes={themes}
      />
    </main>
  );
}
