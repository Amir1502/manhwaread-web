import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getAllBooksSummary,
  getBookById,
  getAllCategories,
  getAllThemes,
  getAllFipiDirections,
  filterBooks,
} from '../lib/books';

describe('Books Library & Essay Cheatsheet (Итоговое сочинение 11 класс)', () => {
  it('loads all 21 required books in index summary', () => {
    const books = getAllBooksSummary();
    assert.strictEqual(books.length, 21, 'Should contain exactly 21 required books');

    for (const book of books) {
      assert.ok(book.id, 'Book must have id');
      assert.ok(book.title, `Book ${book.id} must have title`);
      assert.ok(book.author, `Book ${book.id} must have author`);
      assert.ok(book.category, `Book ${book.id} must have category`);
      assert.ok(Array.isArray(book.themes) && book.themes.length > 0, `Book ${book.id} must have themes`);
      assert.ok(Array.isArray(book.fipiDirections) && book.fipiDirections.length > 0, `Book ${book.id} must have fipiDirections`);
      assert.ok(book.readTime, `Book ${book.id} must have readTime`);
      assert.ok(book.summary, `Book ${book.id} must have summary`);
      assert.ok(book.totalChapters >= 1, `Book ${book.id} must have at least 1 chapter`);
      assert.ok(book.totalWords > 0, `Book ${book.id} must have word count`);
    }
  });

  it('matches category distribution specified by user', () => {
    const books = getAllBooksSummary();

    const largeUniversal = books.filter(b => b.category === 'Большое, но универсальное');
    const smallUniversal = books.filter(b => b.category === 'Небольшое, но универсальное');
    const largeUseful = books.filter(b => b.category === 'Большое, но полезное');

    assert.strictEqual(largeUniversal.length, 2, '2 books in "Большое, но универсальное"');
    assert.strictEqual(smallUniversal.length, 18, '18 books in "Небольшое, но универсальное"');
    assert.strictEqual(largeUseful.length, 1, '1 book in "Большое, но полезное"');

    // Check specific required works
    const titles = books.map(b => b.title);
    assert.ok(titles.some(t => t.includes('Капитанская дочка')));
    assert.ok(titles.some(t => t.includes('Людочка')));
    assert.ok(titles.some(t => t.includes('Судьба человека')));
    assert.ok(titles.some(t => t.includes('Русский характер')));
    assert.ok(titles.some(t => t.includes('Маленький принц')));
    assert.ok(titles.some(t => t.includes('Старуха Изергиль')));
    assert.ok(titles.some(t => t.includes('Любовь к жизни')));
    assert.ok(titles.some(t => t.includes('Юшка')));
    assert.ok(titles.some(t => t.includes('Чудесный доктор')));
    assert.ok(titles.some(t => t.includes('Конь с розовой гривой')));
    assert.ok(titles.some(t => t.includes('Скрипка Ротшильда')));
    assert.ok(titles.some(t => t.includes('Зелёная лампа')));
    assert.ok(titles.some(t => t.includes('Дары волхвов')));
    assert.ok(titles.some(t => t.includes('Левша')));
    assert.ok(titles.some(t => t.includes('Фотография, на которой меня нет')));
    assert.ok(titles.some(t => t.includes('Тарас Бульба')));
    assert.ok(titles.some(t => t.includes('Вельд')));
    assert.ok(titles.some(t => t.includes('Улыбка')));
    assert.ok(titles.some(t => t.includes('Письма о добром и прекрасном')));
    assert.ok(titles.some(t => t.includes('Слово живое и мёртвое')));
    assert.ok(titles.some(t => t.includes('Слепой музыкант')));
  });

  it('loads full book data with chapters and arguments for every single book', () => {
    const summaries = getAllBooksSummary();

    for (const s of summaries) {
      const full = getBookById(s.id);
      assert.ok(full, `Book ${s.id} should load successfully`);
      assert.ok(full.chapters.length >= 1, `Book ${s.id} must have chapters`);
      assert.ok(full.chapters[0].content.length > 0, `Book ${s.id} first chapter must have paragraphs`);
      assert.ok(full.essayArguments.length > 0, `Book ${s.id} must have essay arguments`);

      for (const arg of full.essayArguments) {
        assert.ok(arg.theme, `Argument in ${s.id} must have theme`);
        assert.ok(arg.thesis, `Argument in ${s.id} must have thesis`);
        assert.ok(arg.argument, `Argument in ${s.id} must have argument text`);
      }
    }
  });

  it('safely handles non-existent or path traversal IDs in getBookById', () => {
    assert.strictEqual(getBookById('non-existent-book-id'), null);
    assert.strictEqual(getBookById('../../../etc/passwd'), null);
    assert.strictEqual(getBookById(''), null);
  });

  it('filters books by query search', () => {
    const byPushkin = filterBooks({ query: 'Пушкин' });
    assert.ok(byPushkin.length >= 1);
    assert.ok(byPushkin.some(b => b.title.includes('Капитанская дочка')));

    const byTitle = filterBooks({ query: 'Маленький принц' });
    assert.strictEqual(byTitle.length, 1);
    assert.strictEqual(byTitle[0].id, 'malenkiy-prints');
  });

  it('filters books by category', () => {
    const large = filterBooks({ category: 'Большое, но универсальное' });
    assert.strictEqual(large.length, 2);

    const useful = filterBooks({ category: 'Большое, но полезное' });
    assert.strictEqual(useful.length, 1);
    assert.strictEqual(useful[0].id, 'slepoi-muzykant');
  });

  it('filters books by theme tag', () => {
    const loveBooks = filterBooks({ theme: 'любовь' });
    assert.ok(loveBooks.length >= 2, 'Should find multiple books on theme "любовь"');
    assert.ok(loveBooks.some(b => b.id === 'dary-volkhvov'));
  });

  it('provides all categories, themes, and FIPI directions', () => {
    const categories = getAllCategories();
    assert.strictEqual(categories.length, 3);

    const themes = getAllThemes();
    assert.ok(themes.length > 5, 'Should extract unique themes');
    assert.ok(themes.includes('Любовь') || themes.includes('Добро и зло'));

    const directions = getAllFipiDirections();
    assert.ok(directions.length >= 3, 'Should include FIPI directions');
  });
});
