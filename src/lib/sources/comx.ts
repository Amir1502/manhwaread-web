import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import crypto from 'crypto';
import { MangaListResult, Page, SChapter, SManga, SortMode } from '../types';
import { MangaSource, makeMangaId, proxied } from './base';
import { BROWSER_UA, SourceError, cached, cleanText, parseChapterNumber, toIsoDate } from './http';

export const COMX_BASE = 'https://com-x.life';

const STATUS_MAP: Record<string, SManga['status']> = {
  завершен: 'COMPLETED',
  завершён: 'COMPLETED',
  продолжается: 'ONGOING',
  онгоинг: 'ONGOING',
  заморожен: 'HIATUS',
  приостановлен: 'HIATUS',
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
  const match = clean.match(/^([^\/?#]+)\.html/);
  if (match) return match[1];
  const parts = clean.split('/').filter(Boolean);
  const last = parts[parts.length - 1] || '';
  const lastMatch = last.match(/^([^\/?#]+)\.html/);
  if (lastMatch) return lastMatch[1];
  return parts[0] || null;
}

/** Client that automatically solves DDoS-Guard challenge for com-x.life */
class ComxClient {
  private cookies = new Map<string, string>();
  private solvingPromise: Promise<void> | null = null;

  private cookieString(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  private updateCookies(res: Response) {
    const raw: string[] = res.headers.getSetCookie
      ? res.headers.getSetCookie()
      : [res.headers.get('set-cookie')].filter((c): c is string => Boolean(c));
    for (const c of raw) {
      if (!c) continue;
      const [pair] = c.split(';');
      const [k, v] = pair.split('=');
      if (k && v) this.cookies.set(k.trim(), v.trim());
    }
  }

  private hasValidGuardCookie(): boolean {
    return this.cookies.has('__guard_id');
  }

  private async solveChallenge(html: string): Promise<void> {
    const tokenMatch = html.match(/token:\s*["']([^"']+)["']/);
    if (!tokenMatch) return;
    const token = tokenMatch[1];

    let nonce = 0;
    let hashHex = '';
    while (true) {
      const hash = crypto.createHash('sha256').update(token + ':' + nonce).digest('hex');
      if (hash.startsWith('00')) {
        hashHex = hash;
        break;
      }
      nonce++;
    }

    const params = new URLSearchParams();
    params.set('token', token);
    params.set('mode', 'modern');
    params.set('workTime', '50');
    params.set('iterations', String(nonce + 1));
    params.set('hasCrypto', '1');
    params.set('pow_nonce', String(nonce));
    params.set('pow_hash', hashHex);
    params.set('webdriver', '0');
    params.set('touch', '0');
    params.set('screen_w', '1920');
    params.set('screen_h', '1080');
    params.set('screen_cd', '24');
    params.set('tz', '0');
    params.set('dpr', '1');
    params.set('cdp', '0');
    params.set('cdpf', '');

    const res = await fetch(`${COMX_BASE}/_v`, {
      method: 'POST',
      headers: {
        'User-Agent': BROWSER_UA,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': this.cookieString(),
        Referer: `${COMX_BASE}/`,
      },
      body: params.toString(),
    });
    this.updateCookies(res);
  }

  private async ensureReady(): Promise<void> {
    if (this.solvingPromise) {
      await this.solvingPromise;
      return;
    }
    if (!this.hasValidGuardCookie()) {
      this.solvingPromise = this.initSession().finally(() => {
        this.solvingPromise = null;
      });
      await this.solvingPromise;
    }
  }

  private async initSession(): Promise<void> {
    const res = await fetch(`${COMX_BASE}/`, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
      },
    });
    this.updateCookies(res);
    const text = await res.text();
    if (text.includes('token:')) {
      await this.solveChallenge(text);
    }
  }

  async fetchHtml(url: string): Promise<string> {
    await this.ensureReady();
    const reqHeaders = {
      'User-Agent': BROWSER_UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
      Cookie: this.cookieString(),
      Referer: `${COMX_BASE}/`,
    };

    const res = await fetch(url, { headers: reqHeaders });
    this.updateCookies(res);
    const text = await res.text();

    if (res.status === 404 && text.includes('token:')) {
      if (!this.solvingPromise) {
        this.solvingPromise = this.solveChallenge(text).finally(() => {
          this.solvingPromise = null;
        });
      }
      await this.solvingPromise;
      const retry = await fetch(url, {
        headers: {
          ...reqHeaders,
          Cookie: this.cookieString(),
        },
      });
      this.updateCookies(retry);
      if (!retry.ok) {
        throw new SourceError(`HTTP ${retry.status} for ${new URL(url).host}`, retry.status);
      }
      return retry.text();
    }

    if (!res.ok) {
      throw new SourceError(`HTTP ${res.status} for ${new URL(url).host}`, res.status);
    }
    return text;
  }
}

const client = new ComxClient();

export function parseComxCatalog(html: string, $in?: CheerioAPI): MangaListResult {
  const $ = $in || cheerio.load(html);
  const items: SManga[] = [];
  const seen = new Set<string>();

  // Format 1: Catalog list / search list (.readed)
  $('.readed').each((_, el) => {
    const card = $(el);
    const link = card.find('h3.readed__title a, a.readed__img').first();
    const href = link.attr('href');
    const slug = extractSlug(href);
    if (!slug || seen.has(slug)) return;
    seen.add(slug);

    const rawTitle = cleanText(card.find('.readed__title').first().text()) || slug;
    let title = rawTitle;
    let altTitle: string | undefined;
    if (rawTitle.includes(' / ')) {
      const parts = rawTitle.split(/\s+\/\s+/);
      title = parts[parts.length - 1] || parts[0];
      altTitle = parts[0];
    }

    const imgEl = card.find('img').first();
    const posterSrc = imgEl.attr('data-src') || imgEl.attr('src');
    const coverUrl = posterSrc
      ? (posterSrc.startsWith('http') ? posterSrc : `${COMX_BASE}${posterSrc.startsWith('/') ? '' : '/'}${posterSrc}`)
      : '';

    const ratingText = cleanText(card.find('.current-rating').first().text());
    let rating = parseFloat(ratingText) || 0;
    if (rating > 10) rating = rating / 10;

    const desc = cleanText(card.find('.readed__info li').first().text());

    const genres: string[] = [];
    card.find('.readed__info a').each((_, a) => {
      const g = cleanText($(a).text());
      if (g && !genres.includes(g)) genres.push(g);
    });

    const metaType = cleanText(card.find('.readed__meta-item').first().text());
    let releaseYear: number | undefined;
    const yearMatch = card.find('.readed__meta').text().match(/(19\d\d|20\d\d)/);
    if (yearMatch) releaseYear = parseInt(yearMatch[1], 10);

    items.push({
      id: makeMangaId('comx', slug),
      sourceId: 'comx',
      title,
      altTitle,
      description: desc,
      coverUrl: proxied(coverUrl, 'comx'),
      authors: [],
      status: 'UNKNOWN',
      rating,
      genres,
      type: metaType || undefined,
      releaseYear,
      sourceUrl: `${COMX_BASE}/${slug}.html`,
    });
  });

  // Format 2: Grid posters (.poster.grid-item)
  $('.poster.grid-item').each((_, el) => {
    const card = $(el);
    const href = card.attr('href') || card.find('a').first().attr('href');
    const slug = extractSlug(href);
    if (!slug || seen.has(slug)) return;
    seen.add(slug);

    const rawTitle = cleanText(card.find('.poster__title').first().text()) || slug;
    let title = rawTitle;
    let altTitle: string | undefined;
    if (rawTitle.includes(' / ')) {
      const parts = rawTitle.split(/\s+\/\s+/);
      title = parts[parts.length - 1] || parts[0];
      altTitle = parts[0];
    }

    const imgEl = card.find('img').first();
    const posterSrc = imgEl.attr('data-src') || imgEl.attr('src');
    const coverUrl = posterSrc
      ? (posterSrc.startsWith('http') ? posterSrc : `${COMX_BASE}${posterSrc.startsWith('/') ? '' : '/'}${posterSrc}`)
      : '';

    const ratingText = cleanText(card.find('.poster__label--rate').first().text());
    let rating = parseFloat(ratingText) || 0;
    if (rating > 10) rating = rating / 10;

    let releaseYear: number | undefined;
    const subtitleText = cleanText(card.find('.poster__subtitle').text()) || cleanText(card.text());
    const yearMatch = subtitleText.match(/(19\d\d|20\d\d)/);
    if (yearMatch) releaseYear = parseInt(yearMatch[1], 10);

    items.push({
      id: makeMangaId('comx', slug),
      sourceId: 'comx',
      title,
      altTitle,
      description: '',
      coverUrl: proxied(coverUrl, 'comx'),
      authors: [],
      status: 'UNKNOWN',
      rating,
      genres: [],
      releaseYear,
      sourceUrl: `${COMX_BASE}/${slug}.html`,
    });
  });

  const hasNextPage =
    $('.pagination a:contains("Вперед"), .pagination a:contains("Вперёд"), .pagination a:contains("Следующая"), .pagination a:contains("»")').length > 0 ||
    $('.pagination__pages a').length > 0;

  return { items, hasNextPage };
}

export function parseComxDetails(html: string, slug: string, $in?: CheerioAPI): SManga {
  const $ = $in || cheerio.load(html);

  const rawTitle = cleanText($('h1').first().text()) || slug;
  let title = rawTitle;
  let altTitle: string | undefined;
  if (rawTitle.includes(' / ')) {
    const parts = rawTitle.split(/\s+\/\s+/);
    title = parts[parts.length - 1] || parts[0];
    altTitle = parts[0];
  }

  const desc = cleanText($('.page__text.full-text, .full-text, .page__text').first().text());

  const rText = cleanText($('.current-rating, .poster__label--rate').first().text());
  let rating = parseFloat(rText) || 0;
  if (rating > 10) rating = rating / 10;

  let status: SManga['status'] = 'UNKNOWN';
  let releaseYear: number | undefined;
  const authors: string[] = [];

  $('.page__list li').each((_, el) => {
    const text = cleanText($(el).text());
    if (text.includes('Год:')) {
      const m = text.match(/\b(19\d\d|20\d\d)\b/);
      if (m) releaseYear = parseInt(m[1], 10);
    } else if (text.includes('Статус:')) {
      status = mapStatus(text);
    } else if (text.includes('Автор:')) {
      const a = cleanText(text.replace('Автор:', ''));
      if (a && !authors.includes(a)) authors.push(a);
    }
  });

  const genres: string[] = [];
  $('.page__tags a, .tags a').each((_, el) => {
    const g = cleanText($(el).text());
    if (g && !genres.includes(g)) genres.push(g);
  });

  const imgEl = $('.page__poster img, .poster__img img, .img-fit-cover img').first();
  const posterSrc = imgEl.attr('data-src') || imgEl.attr('src');
  const coverUrl = posterSrc
    ? (posterSrc.startsWith('http') ? posterSrc : `${COMX_BASE}${posterSrc.startsWith('/') ? '' : '/'}${posterSrc}`)
    : '';

  let totalChapters: number | undefined;
  const dataMatch = html.match(/window\.__DATA__\s*=\s*(\{[\s\S]*?\});/);
  if (dataMatch) {
    try {
      const data = JSON.parse(dataMatch[1]);
      if (Array.isArray(data.chapters)) {
        totalChapters = data.chapters.length;
      }
    } catch {}
  }

  return {
    id: makeMangaId('comx', slug),
    sourceId: 'comx',
    title,
    altTitle,
    description: desc,
    coverUrl: proxied(coverUrl, 'comx'),
    authors,
    status,
    rating,
    genres,
    releaseYear,
    totalChapters,
    sourceUrl: `${COMX_BASE}/${slug}.html`,
  };
}

export function parseComxChapters(html: string, slug: string, $in?: CheerioAPI): SChapter[] {
  const dataMatch = html.match(/window\.__DATA__\s*=\s*(\{[\s\S]*?\});/);
  if (dataMatch) {
    try {
      const data = JSON.parse(dataMatch[1]);
      if (Array.isArray(data.chapters)) {
        interface ComxChapterRaw {
          id: number | string;
          posi?: number;
          pages?: number;
          title?: string;
          volume?: number;
          number?: number;
          date?: string;
        }

        const chapters: SChapter[] = (data.chapters as ComxChapterRaw[]).map((ch: ComxChapterRaw) => {
          const num =
            typeof ch.number === 'number' && !Number.isNaN(ch.number)
              ? ch.number
              : (typeof ch.posi === 'number' ? ch.posi : parseChapterNumber(String(ch.title || '')));

          let releaseDate: string | undefined;
          if (ch.date && typeof ch.date === 'string') {
            const dp = ch.date.split('.');
            if (dp.length === 3) {
              releaseDate = `${dp[2]}-${dp[1].padStart(2, '0')}-${dp[0].padStart(2, '0')}`;
            } else {
              releaseDate = toIsoDate(ch.date);
            }
          }

          let title = ch.title ? String(ch.title) : `Глава ${num}`;
          if (title.startsWith('1 -')) {
            title = `Глава ${title.replace(/^1\s*-\s*/, '')}`;
          } else if (!title.toLowerCase().includes('глава')) {
            title = `Глава ${title}`;
          }

          return {
            id: String(ch.id),
            mangaId: makeMangaId('comx', slug),
            sourceId: 'comx',
            number: num,
            title,
            releaseDate,
          };
        });

        return chapters.sort((a, b) => b.number - a.number);
      }
    } catch {}
  }

  // Fallback: DOM links
  const $ = $in || cheerio.load(html);
  const chapters: SChapter[] = [];
  const seen = new Set<string>();

  $('a[href*="/reader/"]').each((_, el) => {
    const a = $(el);
    const href = a.attr('href') || '';
    const m = href.match(/\/reader\/\d+\/(\d+)/);
    if (!m) return;
    const chId = m[1];
    if (seen.has(chId)) return;
    seen.add(chId);

    const nameText = cleanText(a.text());
    const number = parseChapterNumber(nameText);
    chapters.push({
      id: chId,
      mangaId: makeMangaId('comx', slug),
      sourceId: 'comx',
      number,
      title: nameText || `Глава ${number}`,
    });
  });

  return chapters.sort((a, b) => b.number - a.number);
}

export function parseComxPages(html: string, $in?: CheerioAPI): Page[] {
  const dataMatch = html.match(/window\.__DATA__\s*=\s*(\{[\s\S]*?\});/);
  if (dataMatch) {
    try {
      const data = JSON.parse(dataMatch[1]);
      if (Array.isArray(data.images) && data.images.length > 0) {
        const host = data.host || 'rus.com-x.life';
        return data.images.map((img: string, i: number) => {
          const fullUrl = img.startsWith('http') ? img : `https://${host}/comix/${img}`;
          return {
            index: i + 1,
            imageUrl: proxied(fullUrl, 'comx'),
          };
        });
      }
    } catch {}
  }

  // Fallback: Cheerio
  const $ = $in || cheerio.load(html);
  const pages: Page[] = [];
  const seen = new Set<string>();

  $('.reader__pages img, #reader img, .reader img').each((i, el) => {
    const img = $(el);
    let src = img.attr('data-src') || img.attr('src') || '';
    if (!src || src.startsWith('data:') || seen.has(src)) return;
    seen.add(src);

    if (!src.startsWith('http')) {
      src = `${COMX_BASE}${src.startsWith('/') ? '' : '/'}${src}`;
    }

    pages.push({
      index: i + 1,
      imageUrl: proxied(src, 'comx'),
    });
  });

  return pages;
}

export const comxSource: MangaSource = {
  meta: {
    id: 'comx',
    name: 'Com-X',
    lang: 'ru',
    baseUrl: COMX_BASE,
    isOnline: true,
    supportsSearch: true,
  },
  imageReferer: `${COMX_BASE}/`,
  imageHosts: [/(^|\.)com-x\.life$/i],

  list(sort: SortMode, page: number) {
    return cached(`comx:list:${sort}:${page}`, 3 * 60_000, async () => {
      const path =
        sort === 'popular'
          ? (page === 1 ? '/watched/' : `/watched/page/${page}/`)
          : (page === 1 ? '/comix-read/' : `/comix-read/page/${page}/`);
      const html = await client.fetchHtml(`${COMX_BASE}${path}`);
      return parseComxCatalog(html);
    });
  },

  search(query: string, page: number) {
    return cached(`comx:search:${query}:${page}`, 3 * 60_000, async () => {
      const q = encodeURIComponent(query.trim());
      const path = page === 1 ? `/search/${q}/` : `/search/${q}/page/${page}/`;
      const html = await client.fetchHtml(`${COMX_BASE}${path}`);
      return parseComxCatalog(html);
    });
  },

  details(slug: string) {
    return cached(`comx:details:${slug}`, 5 * 60_000, async () => {
      const cleanSlug = slug.replace(/\.html$/, '');
      const html = await client.fetchHtml(`${COMX_BASE}/${encodeURIComponent(cleanSlug)}.html`);
      return parseComxDetails(html, cleanSlug);
    });
  },

  chapters(slug: string) {
    return cached(`comx:chapters:${slug}`, 5 * 60_000, async () => {
      const cleanSlug = slug.replace(/\.html$/, '');
      const html = await client.fetchHtml(`${COMX_BASE}/${encodeURIComponent(cleanSlug)}.html`);
      return parseComxChapters(html, cleanSlug);
    });
  },

  async pages(slug: string, chapterId: string) {
    const m = slug.match(/^(\d+)/);
    const newsId = m ? m[1] : slug;
    const html = await client.fetchHtml(`${COMX_BASE}/reader/${newsId}/${encodeURIComponent(chapterId)}`);
    const pages = parseComxPages(html);
    if (pages.length === 0) {
      throw new SourceError('Не удалось извлечь страницы главы Com-X', 404);
    }
    return pages;
  },
};
