import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import { MangaListResult, Page, SChapter, SManga, SortMode } from '../types';
import { MangaSource, makeMangaId, proxied } from './base';
import { cached, cleanText, getText, parseChapterNumber, toIsoDate } from './http';

/** MangaMir: Laravel + Livewire SSR. Contract verified on the live site (see Notion page «manhwaread», этап 1). */
export const MANGAMIR_BASE = 'https://mangamir.com';
const HEADERS = { Referer: `${MANGAMIR_BASE}/` };

const STATUS: Record<string, SManga['status']> = {
  выпускается: 'ONGOING',
  ongoing: 'ONGOING',
  выпущено: 'COMPLETED',
  завершён: 'COMPLETED',
  завершен: 'COMPLETED',
  finished: 'COMPLETED',
  заморожено: 'HIATUS',
  приостановлено: 'HIATUS',
};

function mapStatus(text?: string): SManga['status'] {
  return STATUS[(text || '').trim().toLowerCase()] || 'UNKNOWN';
}

export function coverSize(url: string | undefined, size: 'md' | 'full'): string | undefined {
  if (!url) return undefined;
  return url.replace(/_(sm|md)(?=\.(jpe?g|png|webp)$)/i, size === 'md' ? '_md' : '');
}

function slugFromHref(href?: string): string | null {
  if (!href) return null;
  try {
    const path = new URL(href, MANGAMIR_BASE).pathname;
    const m = path.match(/^\/manga\/([^/]+)\/?$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export function parseMangaMirCatalog(html: string, $in?: CheerioAPI, scope?: string): MangaListResult {
  const $ = $in || cheerio.load(html);
  const seen = new Set<string>();
  const items: SManga[] = [];
  const anchors = scope ? $(scope).find('a[data-card-link-type="poster"]') : $('a[data-card-link-type="poster"]');
  anchors.each((_, el) => {
    const a = $(el);
    const slug = slugFromHref(a.attr('href'));
    if (!slug || seen.has(slug)) return;
    if (!scope && a.closest('[x-data^="bookCarousel"]').length) return;
    seen.add(slug);
    const img = a.find('img').first();
    const section = a.parents('section').first();
    const type = cleanText(section.find('.badge.badge-neutral').first().text()) || undefined;
    let status: SManga['status'] = 'UNKNOWN';
    section.find('.badge').each((__, b) => {
      const s = mapStatus($(b).text());
      if (status === 'UNKNOWN' && s !== 'UNKNOWN') status = s;
    });
    const title = a.attr('title') || (img.attr('alt') || '').replace(/\s*обложка манги$/i, '') || slug;
    items.push({
      id: makeMangaId('mangamir', slug),
      sourceId: 'mangamir',
      title: cleanText(title),
      description: '',
      coverUrl: proxied(coverSize(img.attr('src'), 'md'), 'mangamir'),
      authors: [],
      status,
      rating: 0,
      genres: [],
      type,
      sourceUrl: `${MANGAMIR_BASE}/manga/${slug}`,
    });
  });
  const hasNextPage =
    $('link[rel="next"]').length > 0 || $('a').filter((_, e) => $(e).text().trim() === 'Вперёд').length > 0;
  return { items, hasNextPage: items.length > 0 && hasNextPage };
}

interface LdChapter {
  name?: string;
  position?: number;
  url?: string;
}
interface LdData {
  name?: string;
  description?: string;
  image?: string;
  genres: string[];
  keywords: string[];
  chapters: LdChapter[];
  rating?: number;
  ratingCount?: number;
}

function readJsonLd($: CheerioAPI): LdData | null {
  const out: LdData = { genres: [], keywords: [], chapters: [] };
  let found = false;
  $('script[type="application/ld+json"]').each((_, el) => {
    let root: unknown;
    try {
      root = JSON.parse($(el).html() || '');
    } catch {
      return;
    }
    const nodes: Record<string, unknown>[] = [];
    const push = (n: unknown) => {
      if (Array.isArray(n)) n.forEach(push);
      else if (n && typeof n === 'object') {
        const o = n as Record<string, unknown>;
        if (Array.isArray(o['@graph'])) push(o['@graph']);
        else nodes.push(o);
      }
    };
    push(root);
    for (const n of nodes) {
      const types = ([] as unknown[]).concat(n['@type']).map(String);
      if (types.includes('ComicSeries')) {
        found = true;
        out.name = typeof n.name === 'string' ? n.name : out.name;
        out.description = typeof n.description === 'string' ? n.description : out.description;
        const img = n.image as unknown;
        out.image =
          typeof img === 'string'
            ? img
            : Array.isArray(img)
              ? String(img[0])
              : (img as { url?: string })?.url || out.image;
        out.genres = ([] as unknown[]).concat(n.genre || []).map(String);
        out.keywords = ([] as unknown[]).concat(n.keywords || []).map(String);
        out.chapters = ([] as unknown[]).concat(n.hasPart || []) as LdChapter[];
      } else if (types.includes('AggregateRating')) {
        const best = Number(n.bestRating) || 10;
        const v = Number(n.ratingValue);
        if (Number.isFinite(v)) out.rating = Math.round(((v * 10) / best) * 100) / 100;
        out.ratingCount = Number(n.ratingCount) || undefined;
      }
    }
  });
  return found ? out : null;
}

export function parseMangaMirDetails(html: string, slug: string): { manga: SManga; chapters: SChapter[] } {
  const $ = cheerio.load(html);
  const ld = readJsonLd($);
  const mangaId = makeMangaId('mangamir', slug);
  const notCarousel = (sel: string) => $(sel).filter((_, e) => $(e).closest('[x-data^="bookCarousel"]').length === 0);

  const descEl = $('[x-data="showMore"] [x-ref="content"] h2 + div').first();
  descEl.find('br').replaceWith('\n');
  const description = cleanText(descEl.text()) || ld?.description || '';

  const keywords = ld?.keywords || [];
  const ageRating = keywords.find(k => /^\d{1,2}\+$/.test(k));
  const domGenres = notCarousel('a[href^="/genre/"]')
    .map((_, e) => cleanText($(e).text()))
    .get();
  const genres = Array.from(new Set((ld?.genres.length ? ld.genres : domGenres).filter(Boolean)));

  const statusText = cleanText($('a[href*="status[0]="] .badge').first().text());
  const statusParam = ($('a[href*="status[0]="]').first().attr('href') || '').match(/status\[0\]=([^&]+)/)?.[1];
  const status = mapStatus(statusText) !== 'UNKNOWN' ? mapStatus(statusText) : mapStatus(statusParam);

  const cover = ld?.image || notCarousel('img[src*="/posters/"]').first().attr('src');

  const manga: SManga = {
    id: mangaId,
    sourceId: 'mangamir',
    title: ld?.name || cleanText($('h1').first().text()) || slug,
    description,
    coverUrl: proxied(coverSize(cover, 'full'), 'mangamir'),
    authors: [],
    status,
    rating: ld?.rating || 0,
    genres,
    type: cleanText($('a[href*="type[0]="] .badge').first().text()) || undefined,
    ageRating,
    isAdult: ageRating === '18+',
    sourceUrl: `${MANGAMIR_BASE}/manga/${slug}`,
  };

  // Dates from DOM rows (only released chapters have <time>), merged by URL.
  const dates = new Map<string, string | undefined>();
  const domRows: LdChapter[] = [];
  $('li.list-row').each((_, li) => {
    const row = $(li);
    const time = row.find('time[datetime]').first();
    if (!time.length) return; // «Прогноз» / unreleased
    const a = row.find('a[href][title]').not('.btn').first();
    const href = a.attr('href');
    if (!href) return;
    const url = new URL(href, MANGAMIR_BASE).pathname;
    dates.set(url, time.attr('datetime'));
    domRows.push({ name: a.attr('title') || cleanText(a.text()), url });
  });

  const source: LdChapter[] = ld?.chapters.length
    ? ld.chapters
    : domRows.map((r, i) => ({ ...r, position: domRows.length - i }));

  const seen = new Set<string>();
  const ranked: Array<{ pos: number; ch: SChapter }> = [];
  for (const ch of source) {
    if (!ch.url) continue;
    const path = new URL(ch.url, MANGAMIR_BASE).pathname;
    const chSlug = path.split('/').filter(Boolean)[2];
    if (!chSlug || seen.has(chSlug)) continue;
    if (ld?.chapters.length && dates.size > 0 && !dates.has(path)) continue; // not released yet
    seen.add(chSlug);
    const name = cleanText(ch.name) || chSlug;
    const vol = name.match(/Том\s+(\d+)/i)?.[1];
    ranked.push({
      pos: ch.position ?? 0,
      ch: {
        id: chSlug,
        mangaId,
        sourceId: 'mangamir',
        number: parseChapterNumber(name.replace(/Том\s+\d+/i, '')),
        volume: vol ? parseInt(vol, 10) : undefined,
        title: name,
        releaseDate: toIsoDate(dates.get(path)),
      },
    });
  }
  // JSON-LD position: 1 = oldest. Dates are not monotonic (300.1 can be older than 300), so never sort by date.
  const chapters = ranked.sort((a, b) => b.pos - a.pos).map(r => r.ch);
  manga.totalChapters = chapters.length;
  return { manga, chapters };
}

export function parseMangaMirPages(html: string): Page[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const imgs = $('[x-data="reader"] img[src*="/pages/"]')
    .map((i, el) => ({
      src: $(el).attr('src') || '',
      n: parseInt($(el).attr('data-number') || '', 10),
      order: i,
      w: parseInt($(el).attr('width') || '', 10) || undefined,
      h: parseInt($(el).attr('height') || '', 10) || undefined,
    }))
    .get()
    .filter(p => p.src && !seen.has(p.src) && seen.add(p.src));
  imgs.sort((a, b) => (Number.isFinite(a.n) && Number.isFinite(b.n) ? a.n - b.n : a.order - b.order));
  return imgs.map((p, i) => ({
    index: i + 1,
    imageUrl: proxied(p.src, 'mangamir'),
    width: p.w,
    height: p.h,
  }));
}

function loadTitle(slug: string) {
  return cached(`mm:title:${slug}`, 5 * 60_000, async () => {
    const html = await getText(`${MANGAMIR_BASE}/manga/${encodeURIComponent(slug)}?toc`, { headers: HEADERS });
    return parseMangaMirDetails(html, slug);
  });
}

async function catalog(params: Record<string, string>, page: number) {
  const qs = new URLSearchParams({ ...params, page: String(page) });
  const html = await getText(`${MANGAMIR_BASE}/manga?${qs}`, {
    headers: HEADERS,
  });
  return parseMangaMirCatalog(html);
}

export const mangamirSource: MangaSource = {
  meta: {
    id: 'mangamir',
    name: 'MangaMir',
    lang: 'ru',
    baseUrl: MANGAMIR_BASE,
    isOnline: true,
    supportsSearch: true,
  },
  imageReferer: `${MANGAMIR_BASE}/`,
  imageHosts: [/(^|\.)mangamir\.com$/],
  list: (sort: SortMode, page: number) =>
    catalog({ sort: sort === 'latest' ? 'last_chapter_id' : 'views', dir: 'desc' }, page),
  search: (query: string, page: number) => catalog({ q: query }, page),
  details: async slug => (await loadTitle(slug)).manga,
  chapters: async slug => (await loadTitle(slug)).chapters,
  pages: async (slug, chapterId) => {
    const html = await getText(`${MANGAMIR_BASE}/manga/${encodeURIComponent(slug)}/${encodeURIComponent(chapterId)}`, {
      headers: HEADERS,
    });
    return parseMangaMirPages(html);
  },
};
