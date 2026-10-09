import * as cheerio from 'cheerio';
import { MangaListResult, Page, SChapter, SManga, SortMode } from '../types';
import { MangaSource, makeMangaId, proxied } from './base';
import { cached, cleanText, getText, parseChapterNumber, toIsoDate } from './http';

/** Manga18fx — 18+ English manhwa (Madara-like markup). Disabled unless the user enables adult content. */
export const FX_BASE = 'https://manga18fx.com';
const HEADERS = { Referer: `${FX_BASE}/` };

function slugFromHref(href?: string): string | null {
  if (!href) return null;
  const m = new URL(href, FX_BASE).pathname.match(/^\/manga\/([^/]+)\/?$/);
  return m ? m[1] : null;
}

function img($el: { attr(name: string): string | undefined }): string | undefined {
  const v = ($el.attr('data-src') || $el.attr('src') || '').trim();
  return v ? new URL(v, FX_BASE).toString() : undefined;
}

export function parseFxCatalog(html: string): MangaListResult {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const items: SManga[] = [];
  $('.page-item').each((_, el) => {
    const item = $(el);
    if (item.closest('.related-manga').length) return;
    const link = item.find('.tt a').first();
    const slug = slugFromHref(link.attr('href'));
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    const rating = parseFloat(item.find('.item-rate span').first().text()) || 0;
    items.push({
      id: makeMangaId('manga18fx', slug),
      sourceId: 'manga18fx',
      title: cleanText(link.text()),
      description: '',
      coverUrl: proxied(img(item.find('.thumb-manga img').first()), 'manga18fx'),
      authors: [],
      status: 'UNKNOWN',
      rating: Math.round(rating * 2 * 10) / 10, // site uses 0..5
      genres: [],
      ageRating: '18+',
      isAdult: true,
      sourceUrl: `${FX_BASE}/manga/${slug}`,
    });
  });
  const hasNextPage = $('#blog-pager li.next:not(.disabled), .blog-pager li.next:not(.disabled)').length > 0;
  return { items, hasNextPage };
}

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/** "02 Oct 26" → 2026-10-02 */
export function parseFxDate(s: string): string | undefined {
  const m = s.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})$/);
  if (!m) return undefined;
  const year = m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
  const month = MONTHS[m[2].toLowerCase()];
  if (month === undefined) return undefined;
  return toIsoDate(Date.UTC(year, month, parseInt(m[1], 10)));
}

export function parseFxDetails(html: string, slug: string): { manga: SManga; chapters: SChapter[] } {
  const $ = cheerio.load(html);
  const field = (label: string) =>
    $('.post-content_item')
      .filter((_, e) => $(e).find('.summary-heading h5').text().toLowerCase().includes(label))
      .first()
      .find('.summary-content');
  const statusText = cleanText(field('status').text()).toLowerCase();
  const alt = cleanText(field('alternative').text());
  const authors = [...field('author').find('a').toArray(), ...field('artist').find('a').toArray()]
    .map(a => cleanText($(a).text()))
    .filter((v, i, arr) => v && v !== 'Updating' && arr.indexOf(v) === i);
  const rating = parseFloat($('#averagerate').first().text()) || 0;
  const desc = $('.dsct').first();
  desc.find('p').each((_, p) => {
    $(p).append('\n');
  });
  const mangaId = makeMangaId('manga18fx', slug);

  const manga: SManga = {
    id: mangaId,
    sourceId: 'manga18fx',
    title: cleanText($('.post-title h1').first().text()) || slug,
    altTitle: alt && alt !== 'N/A' ? alt.split(' / ')[0] : undefined,
    description: cleanText(desc.text()),
    coverUrl: proxied(img($('.summary_image img').first()), 'manga18fx'),
    authors,
    status: statusText.includes('ongoing') ? 'ONGOING' : statusText.includes('complet') ? 'COMPLETED' : 'UNKNOWN',
    rating: Math.round(rating * 2 * 10) / 10,
    genres: field('genre')
      .find('a')
      .map((_, a) => cleanText($(a).text()))
      .get()
      .filter(Boolean),
    type: cleanText(field('type').text()) || undefined,
    ageRating: '18+',
    isAdult: true,
    sourceUrl: `${FX_BASE}/manga/${slug}`,
  };

  const seen = new Set<string>();
  const chapters: SChapter[] = [];
  $('#chapterlist li.a-h').each((_, li) => {
    const a = $(li).find('a.chapter-name').first();
    const href = a.attr('href');
    if (!href) return;
    const parts = new URL(href, FX_BASE).pathname.split('/').filter(Boolean);
    const chSlug = parts[2];
    if (!chSlug || seen.has(chSlug)) return;
    seen.add(chSlug);
    const name = cleanText(a.text());
    chapters.push({
      id: chSlug,
      mangaId,
      sourceId: 'manga18fx',
      number: parseChapterNumber(name || chSlug.replace(/-/g, ' ')),
      title: name.replace(/^Chapter/i, 'Глава'),
      releaseDate: parseFxDate($(li).find('.chapter-time').text()),
    });
  });
  manga.totalChapters = chapters.length;
  return { manga, chapters };
}

export function parseFxPages(html: string): Page[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  return $('.page-break img')
    .map((_, el) => img($(el)))
    .get()
    .filter((src): src is string => Boolean(src) && !seen.has(src) && Boolean(seen.add(src)))
    .map((src, i) => ({ index: i + 1, imageUrl: proxied(src, 'manga18fx') }));
}

function loadTitle(slug: string) {
  return cached(`fx:title:${slug}`, 5 * 60_000, async () =>
    parseFxDetails(await getText(`${FX_BASE}/manga/${encodeURIComponent(slug)}`, { headers: HEADERS }), slug),
  );
}

export const manga18fxSource: MangaSource = {
  meta: {
    id: 'manga18fx',
    name: 'Manga18fx (18+)',
    lang: 'en',
    baseUrl: FX_BASE,
    isOnline: true,
    supportsSearch: true,
    isAdult: true,
  },
  imageReferer: `${FX_BASE}/`,
  imageHosts: [/(^|\.)manga18fx\.com$/],
  async list(sort: SortMode, page: number) {
    const url =
      sort === 'latest' ? `${FX_BASE}/page/${page}` : `${FX_BASE}/hot-manga${page > 1 ? `?page=${page}` : ''}`;
    return parseFxCatalog(await getText(url, { headers: HEADERS }));
  },
  async search(query: string, page: number) {
    const qs = new URLSearchParams({ q: query });
    if (page > 1) qs.set('page', String(page));
    return parseFxCatalog(await getText(`${FX_BASE}/search?${qs}`, { headers: HEADERS }));
  },
  details: async slug => (await loadTitle(slug)).manga,
  chapters: async slug => (await loadTitle(slug)).chapters,
  pages: async (slug, chapterId) =>
    parseFxPages(
      await getText(`${FX_BASE}/manga/${encodeURIComponent(slug)}/${encodeURIComponent(chapterId)}`, {
        headers: HEADERS,
      }),
    ),
};
