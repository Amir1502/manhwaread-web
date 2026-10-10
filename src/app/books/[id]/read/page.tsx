import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBookById } from '@/lib/books';
import BookReaderClient from '@/components/books/BookReaderClient';

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
    title: `Читать онлайн: «${book.title}» — ${book.author} | ManhwaRead`,
    description: `Удобное чтение онлайн без рекламы: «${book.title}» автора ${book.author}. Полный текст для подготовки к итоговому сочинению.`,
  };
}

export default async function BookReadPage({ params }: PageProps) {
  const { id } = await params;
  const book = getBookById(id);

  if (!book) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0c0d12',
            color: '#9ca3af',
          }}
        >
          Загрузка книги...
        </div>
      }
    >
      <BookReaderClient book={book} />
    </Suspense>
  );
}
