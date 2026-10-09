import { SManga, SChapter, Page, SourceMeta } from '../types';
import { CURATED_MANGAS, CURATED_CHAPTERS, getCuratedPages } from './curated';
import {
  fetchMangaDexPopular,
  searchMangaDex,
  fetchMangaDexDetails,
  fetchMangaDexChapters,
  fetchMangaDexPages
} from './mangadex';

export const AVAILABLE_SOURCES: SourceMeta[] = [
  {
    id: 'all',
    name: 'Все источники',
    lang: 'ru',
    baseUrl: '',
    isOnline: true,
    supportsSearch: true,
  },
  {
    id: 'curated',
    name: 'ManhwaRead Топ (Каталог + AI Оверлей)',
    lang: 'ru',
    baseUrl: 'https://manhwaread.my.to',
    isOnline: true,
    supportsSearch: true,
  },
  {
    id: 'mangadex',
    name: 'MangaDex (API v5)',
    lang: 'multi',
    baseUrl: 'https://mangadex.org',
    isOnline: true,
    supportsSearch: true,
  }
];

export async function getPopularManga(sourceId = 'all'): Promise<SManga[]> {
  if (sourceId === 'curated') {
    return CURATED_MANGAS;
  }
  
  if (sourceId === 'mangadex') {
    const md = await fetchMangaDexPopular(20);
    return md.length > 0 ? md : CURATED_MANGAS;
  }

  // 'all': merge curated + MangaDex
  const mdPopular = await fetchMangaDexPopular(14);
  const combined = [...CURATED_MANGAS];
  
  for (const item of mdPopular) {
    if (!combined.some(c => c.title.toLowerCase() === item.title.toLowerCase())) {
      combined.push(item);
    }
  }
  return combined;
}

export async function searchManga(query: string, sourceId = 'all'): Promise<SManga[]> {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) return getPopularManga(sourceId);

  // Search curated first
  const curatedMatches = CURATED_MANGAS.filter(m =>
    m.title.toLowerCase().includes(cleanQ) ||
    (m.altTitle && m.altTitle.toLowerCase().includes(cleanQ)) ||
    m.genres.some(g => g.toLowerCase().includes(cleanQ))
  );

  if (sourceId === 'curated') {
    return curatedMatches;
  }

  // Search MangaDex
  const mdResults = await searchMangaDex(query, 16);
  const combined = [...curatedMatches];

  for (const item of mdResults) {
    if (!combined.some(c => c.id === item.id)) {
      combined.push(item);
    }
  }

  return combined;
}

export async function getMangaById(id: string): Promise<SManga | null> {
  // Check curated first
  const foundCurated = CURATED_MANGAS.find(m => m.id === id);
  if (foundCurated) return foundCurated;

  // Check MangaDex
  if (id.startsWith('md-')) {
    const mdDetails = await fetchMangaDexDetails(id);
    if (mdDetails) return mdDetails;
  }

  return null;
}

export async function getMangaChapters(mangaId: string): Promise<SChapter[]> {
  if (CURATED_CHAPTERS[mangaId]) {
    return CURATED_CHAPTERS[mangaId];
  }

  if (mangaId.startsWith('md-')) {
    const chapters = await fetchMangaDexChapters(mangaId);
    if (chapters.length > 0) return chapters;
  }

  // Fallback default chapters if none found
  return [
    {
      id: `${mangaId}-ch-1`,
      mangaId,
      sourceId: 'curated',
      number: 1,
      title: 'Глава 1: Пролог',
      releaseDate: '2026-10-09',
      pagesCount: 5,
    }
  ];
}

export async function getChapterPages(mangaId: string, chapterId: string): Promise<Page[]> {
  // Check if it's a curated chapter
  if (!chapterId.startsWith('md-ch-')) {
    return getCuratedPages(chapterId);
  }

  // Fetch from MangaDex
  const mdPages = await fetchMangaDexPages(chapterId);
  if (mdPages.length > 0) {
    return mdPages;
  }

  // Fallback to sample high-res pages if MangaDex at-home node fails
  return getCuratedPages(chapterId);
}
