import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import { MangaListResult, Page, SChapter, SManga, SortMode } from '../types';
import { MangaSource, makeMangaId, proxied } from './base';
import { BROWSER_UA, SourceError, cached, cleanText, getText, parseChapterNumber, toIsoDate } from './http';

export const MANGABUFF_BASE = 'https://mangabuff.ru';
const HEADERS = {
  Referer: `${MANGABUFF_BASE}/`,
  Origin: MANGABUFF_BASE,
  'User-Agent': BROWSER_UA,
  'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
};

const STATUS_MAP: Record<string, SManga['status']> = {
  завершен: 'COMPLETED',
  завершён: 'COMPLETED',
  продолжается: 'ONGOING',
  онгоинг: 'ONGOING',
  заморожен: 'HIATUS',
  заброшен: 'CANCELLED',
};

function mapStatus(text?: string): SManga['status'] {
  const norm = (text || '').trim().toLowerCase();
  for (const [k, v] of Object.entries(STATUS_MAP)) {
    if (norm.includes(k)) return v;
  }
  return 'UNKNOWN';
}

function extractSlug(href?: string): string | null {
  if (!href) return null;
  const clean = href.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+/, '');
  const parts = clean.split('/');
  if (parts[0] === 'manga' && parts[1]) {
    return parts[1];
  }
  return parts[0] || null;
}

export function parseMangaBuffCatalog(html: string, $in?: CheerioAPI): MangaListResult {
  const $ = $in || cheerio.load(html);
  const items: SManga[] = [];
  const seen = new Set<string>();

  $('.cards .cards__item').each((_, el) => {
    const card = $(el);
    const link = card.find('a').first();
    const href = link.attr('href') || card.attr('href');
    const slug = extractSlug(href);
    if (!slug || seen.has(slug)) return;
    seen.add(slug);

    const title = cleanText(card.find('.cards__name').text()) || slug;
    const imgEl = card.find('img').first();
    const posterSrc = imgEl.attr('data-src') || imgEl.attr('src');
    const coverUrl = posterSrc
      ? (posterSrc.startsWith('http') ? posterSrc : `${MANGABUFF_BASE}${posterSrc.startsWith('/') ? '' : '/'}${posterSrc}`)
      : `${MANGABUFF_BASE}/img/manga/posters/${slug}.jpg`;

    items.push({
      id: makeMangaId('mangabuff', slug),
      sourceId: 'mangabuff',
      title,
      description: '',
      coverUrl: proxied(coverUrl, 'mangabuff'),
      authors: [],
      status: 'UNKNOWN',
      rating: 0,
      genres: [],
      sourceUrl: `${MANGABUFF_BASE}/manga/${slug}`,
    });
  });

  const hasNextPage = $('.pagination .pagination__button a:contains("Вперёд"), .pagination a:contains("Следующая")').length > 0;
  return { items, hasNextPage };
}

export function parseMangaBuffDetails(html: string, slug: string, $in?: CheerioAPI): SManga {
  const $ = $in || cheerio.load(html);

  const title =
    cleanText($('h1.manga__name, .manga__name, .manga-mobile__name, h1').first().text()) || slug;
  const altTitle = cleanText($('.manga__name-alt, .manga-mobile__name-alt').first().text()) || undefined;

  const desc = cleanText($('.manga__description').text());
  const ratingText = cleanText($('.manga__rating').first().text());
  const rating = parseFloat(ratingText) || 0;

  const statusText = $('.manga__middle-links > a:last-child, .manga-mobile__info > a:last-child').text();
  const status = mapStatus(statusText);

  const genres: string[] = [];
  $('.manga__middle-links > a:not(:last-child), .manga-mobile__info > a:not(:last-child), .tags > .tags__item').each((_, el) => {
    const g = cleanText($(el).text());
    if (g && !genres.includes(g)) genres.push(g);
  });

  const imgEl = $('.manga__img img, img.manga-mobile__image, .manga__poster img').first();
  const posterSrc = imgEl.attr('data-src') || imgEl.attr('src');
  const coverUrl = posterSrc
    ? (posterSrc.startsWith('http') ? posterSrc : `${MANGABUFF_BASE}${posterSrc.startsWith('/') ? '' : '/'}${posterSrc}`)
    : `${MANGABUFF_BASE}/img/manga/posters/${slug}.jpg`;

  return {
    id: makeMangaId('mangabuff', slug),
    sourceId: 'mangabuff',
    title,
    altTitle,
    description: desc,
    coverUrl: proxied(coverUrl, 'mangabuff'),
    authors: [],
    status,
    rating,
    genres,
    sourceUrl: `${MANGABUFF_BASE}/manga/${slug}`,
  };
}

export function parseMangaBuffChapters(html: string, slug: string, $in?: CheerioAPI): SChapter[] {
  const $ = $in || cheerio.load(html);
  const chapters: SChapter[] = [];
  const seen = new Set<string>();

  $('a.chapters__item').each((_, el) => {
    const a = $(el);
    const href = a.attr('href') || '';
    // Href format: /manga/slug/1 or /manga/slug/chapter-1
    const parts = href.split('/').filter(Boolean);
    const chapterId = parts.length >= 3 ? parts.slice(2).join('/') : parts[parts.length - 1];
    if (!chapterId || seen.has(chapterId)) return;
    seen.add(chapterId);

    const nameText = cleanText(a.find('.chapters__volume, .chapters__value, .chapters__name').text()) || a.text();
    const dateText = cleanText(a.find('.chapters__add-date').text());
    const number = parseChapterNumber(nameText);

    chapters.push({
      id: chapterId,
      mangaId: makeMangaId('mangabuff', slug),
      sourceId: 'mangabuff',
      number,
      title: nameText || `Глава ${number}`,
      releaseDate: toIsoDate(dateText),
    });
  });

  // Sort newest first
  return chapters.sort((a, b) => b.number - a.number);
}

export function parseMangaBuffPages(html: string, $in?: CheerioAPI): Page[] {
  const $ = $in || cheerio.load(html);
  const pages: Page[] = [];
  const seen = new Set<string>();

  $('.reader__pages img, .reader-images img, #reader img').each((i, el) => {
    const img = $(el);
    let src = img.attr('data-src') || img.attr('data-url') || img.attr('src') || '';
    if (!src || src.startsWith('data:') || seen.has(src)) return;
    seen.add(src);

    if (!src.startsWith('http')) {
      src = `${MANGABUFF_BASE}${src.startsWith('/') ? '' : '/'}${src}`;
    }

    pages.push({
      index: i + 1,
      imageUrl: proxied(src, 'mangabuff'),
    });
  });

  return pages;
}

export const mangabuffSource: MangaSource = {
  meta: {
    id: 'mangabuff',
    name: 'MangaBuff',
    lang: 'ru',
    baseUrl: MANGABUFF_BASE,
    isOnline: true,
    supportsSearch: true,
  },
  imageReferer: `${MANGABUFF_BASE}/`,
  imageHosts: [
    /(^|\.)mangabuff\.ru$/i,
    /(^|\.)img\.mangabuff\.ru$/i,
    /(^|\.)cdn\.mangabuff\.ru$/i,
  ],

  list(sort: SortMode, page: number) {
    const sortBy = sort === 'latest' ? 'updated_at' : 'real_views';
    return cached(`mb:list:${sort}:${page}`, 3 * 60_000, async () => {
      try {
        const html = await getText(`${MANGABUFF_BASE}/manga?sort=${sortBy}&page=${page}`, { headers: HEADERS });
        return parseMangaBuffCatalog(html);
      } catch (err: unknown) {
        if (err instanceof SourceError && err.status === 403) {
          throw new SourceError('MangaBuff защищен DDoS-Guard (доступ ограничен для данного IP)', 403);
        }
        throw err;
      }
    });
  },

  search(query: string, page: number) {
    return cached(`mb:search:${query}:${page}`, 3 * 60_000, async () => {
      try {
        const html = await getText(
          `${MANGABUFF_BASE}/search?type=manga&q=${encodeURIComponent(query)}&page=${page}`,
          { headers: HEADERS }
        );
        return parseMangaBuffCatalog(html);
      } catch (err: unknown) {
        if (err instanceof SourceError && err.status === 403) {
          throw new SourceError('MangaBuff временно недоступен через данный IP', 403);
        }
        throw err;
      }
    });
  },

  details(slug: string) {
    return cached(`mb:details:${slug}`, 5 * 60_000, async () => {
      const html = await getText(`${MANGABUFF_BASE}/manga/${encodeURIComponent(slug)}`, { headers: HEADERS });
      return parseMangaBuffDetails(html, slug);
    });
  },

  chapters(slug: string) {
    return cached(`mb:chapters:${slug}`, 5 * 60_000, async () => {
      const html = await getText(`${MANGABUFF_BASE}/manga/${encodeURIComponent(slug)}`, { headers: HEADERS });
      return parseMangaBuffChapters(html, slug);
    });
  },

  async pages(slug: string, chapterId: string) {
    const html = await getText(`${MANGABUFF_BASE}/manga/${encodeURIComponent(slug)}/${encodeURIComponent(chapterId)}`, {
      headers: HEADERS,
    });
    const pages = parseMangaBuffPages(html);
    if (pages.length === 0) {
      throw new SourceError('Не удалось извлечь страницы главы MangaBuff', 404);
    }
    return pages;
  },
};
