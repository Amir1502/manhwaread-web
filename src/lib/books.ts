import fs from 'fs';
import path from 'path';

export interface EssayArgument {
  theme: string;
  thesis: string;
  argument: string;
}

export interface BookChapter {
  id: string;
  title: string;
  content: string[];
}

export type BookCategory =
  | 'Большое, но универсальное'
  | 'Небольшое, но универсальное'
  | 'Большое, но полезное';

export interface BookSummary {
  id: string;
  title: string;
  author: string;
  year?: string;
  category: BookCategory;
  themes: string[];
  fipiDirections: string[];
  readTime: string;
  summary: string;
  argumentsCount: number;
  keyQuotes: string[];
  totalChapters: number;
  totalWords: number;
}

export interface Book extends BookSummary {
  totalParagraphs: number;
  essayArguments: EssayArgument[];
  chapters: BookChapter[];
}

const BOOKS_DIR = path.join(process.cwd(), 'data', 'books');
const INDEX_FILE = path.join(BOOKS_DIR, 'index.json');

let cachedIndex: BookSummary[] | null = null;

export function getAllBooksSummary(): BookSummary[] {
  if (cachedIndex) return cachedIndex;
  try {
    if (!fs.existsSync(INDEX_FILE)) return [];
    const raw = fs.readFileSync(INDEX_FILE, 'utf-8');
    cachedIndex = JSON.parse(raw) as BookSummary[];
    return cachedIndex;
  } catch (err) {
    console.error('Error reading books index:', err);
    return [];
  }
}

export function getBookById(id: string): Book | null {
  try {
    const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, '');
    const bookFile = path.join(BOOKS_DIR, `${cleanId}.json`);
    if (!fs.existsSync(bookFile)) return null;
    const raw = fs.readFileSync(bookFile, 'utf-8');
    return JSON.parse(raw) as Book;
  } catch (err) {
    console.error(`Error reading book ${id}:`, err);
    return null;
  }
}

export function getAllThemes(): string[] {
  const books = getAllBooksSummary();
  const themeSet = new Set<string>();
  for (const b of books) {
    for (const t of b.themes) {
      themeSet.add(t);
    }
  }
  return Array.from(themeSet).sort((a, b) => a.localeCompare(b, 'ru'));
}

export function getAllCategories(): BookCategory[] {
  return [
    'Большое, но универсальное',
    'Небольшое, но универсальное',
    'Большое, но полезное',
  ];
}

export function getAllFipiDirections(): string[] {
  const books = getAllBooksSummary();
  const dirSet = new Set<string>();
  for (const b of books) {
    for (const d of b.fipiDirections) {
      dirSet.add(d);
    }
  }
  return Array.from(dirSet);
}

export interface FilterOptions {
  query?: string;
  category?: string;
  theme?: string;
  direction?: string;
}

export function filterBooks(options: FilterOptions = {}): BookSummary[] {
  const books = getAllBooksSummary();
  const query = options.query?.trim().toLowerCase();
  const category = options.category?.trim();
  const theme = options.theme?.trim();
  const direction = options.direction?.trim();

  return books.filter(b => {
    if (query) {
      const matchTitle = b.title.toLowerCase().includes(query);
      const matchAuthor = b.author.toLowerCase().includes(query);
      const matchSummary = b.summary.toLowerCase().includes(query);
      const matchTheme = b.themes.some(t => t.toLowerCase().includes(query));
      if (!matchTitle && !matchAuthor && !matchSummary && !matchTheme) {
        return false;
      }
    }

    if (category && category !== 'Все') {
      if (b.category.toLowerCase() !== category.toLowerCase()) {
        return false;
      }
    }

    if (theme && theme !== 'Все') {
      const matchTheme = b.themes.some(t => t.toLowerCase() === theme.toLowerCase());
      if (!matchTheme) {
        return false;
      }
    }

    if (direction && direction !== 'Все') {
      const matchDir = b.fipiDirections.some(d => d.toLowerCase() === direction.toLowerCase());
      if (!matchDir) {
        return false;
      }
    }

    return true;
  });
}
