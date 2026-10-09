import { MangaListResult, Page, SChapter, SManga, SortMode } from '../types';
import { MangaSource, makeMangaId, proxied } from './base';
import { cached, getJson, toIsoDate } from './http';

const API = 'https://api.mangadex.org';
const UPLOADS = 'https://uploads.mangadex.org';
const PAGE_SIZE = 24;
const HEADERS = { 'User-Agent': 'ManhwaReadWeb/1.1 (+https://github.com/Amir1502/manhwaread-web)' };
const RATINGS = 'contentRating[]=safe&contentRating[]=suggestive';

interface MangaDexRelationship {
  id: string;
  type: string;
  attributes?: { fileName?: string; name?: string };
}

export interface MangaDexItem {
  id: string;
  type: string;
  attributes: {
    title: Record<string, string>;
    altTitles?: Array<Record<string, string>>;
    description?: Record<string, string>;
    status?: string;
    contentRating?: string;
    originalLanguage?: string;
    tags?: Array<{ attributes: { name: Record<string, string>; group?: string } }>;
    updatedAt?: string;
  };
  relationships?: MangaDexRelationship[];
}

const TYPE_BY_LANG: Record<string, string> = {
  ko: 'Манхва',
  ja: 'Манга',
  zh: 'Маньхуа',
  'zh-hk': 'Маньхуа',
  en: 'Комикс',
};

function pickLocalized(rec: Record<string, string> | undefined): string | undefined {
  if (!rec) return undefined;
  return rec.ru || rec.en || rec['ja-ro'] || rec['ko-ro'] || Object.values(rec)[0];
}

export function parseMangaDexItem(item: MangaDexItem): SManga {
  const a = item.attributes;
  const ruAlt = a.altTitles?.find(t => t.ru)?.ru;
  const enAlt = a.altTitles?.find(t => t.en)?.en;
  const main = pickLocalized(a.title) || 'Без названия';
  const title = a.title.ru || ruAlt || main;
  const altTitle = title !== main ? main : enAlt && enAlt !== title ? enAlt : undefined;

  const coverFile = item.relationships?.find(r => r.type === 'cover_art')?.attributes?.fileName;
  const coverUrl = coverFile ? proxied(`${UPLOADS}/covers/${item.id}/${coverFile}.512.jpg`, 'mangadex') : '';

  const authors = Array.from(
    new Set(
      (item.relationships || [])
        .filter(r => r.type === 'author' || r.type === 'artist')
        .map(r => r.attributes?.name)
        .filter((n): n is string => Boolean(n)),
    ),
  );

  const genres = (a.tags || [])
    .filter(t => !t.attributes.group || t.attributes.group === 'genre' || t.attributes.group === 'theme')
    .map(t => t.attributes.name.ru || t.attributes.name.en || '')
    .filter(Boolean);

  const statusMap: Record<string, SManga['status']> = {
    ongoing: 'ONGOING',
    completed: 'COMPLETED',
    hiatus: 'HIATUS',
    cancelled: 'CANCELLED',
  };

  return {
    id: makeMangaId('mangadex', item.id),
    sourceId: 'mangadex',
    title,
    altTitle,
    description: pickLocalized(a.description) || '',
    coverUrl,
    authors,
    status: statusMap[a.status || ''] || 'UNKNOWN',
    rating: 0,
    genres,
    type: TYPE_BY_LANG[a.originalLanguage || ''],
    isAdult: a.contentRating === 'erotica' || a.contentRating === 'pornographic',
    lastUpdated: toIsoDate(a.updatedAt),
    sourceUrl: `https://mangadex.org/title/${item.id}`,
  };
}

async function listQuery(query: string, page: number): Promise<MangaListResult> {
  const offset = (Math.max(1, page) - 1) * PAGE_SIZE;
  const url = `${API}/manga?limit=${PAGE_SIZE}&offset=${offset}&includes[]=cover_art&includes[]=author&${RATINGS}&hasAvailableChapters=true&availableTranslatedLanguage[]=ru&availableTranslatedLanguage[]=en&${query}`;
  const data = await getJson<{ data: MangaDexItem[]; total: number }>(url, { headers: HEADERS });
  return {
    items: (data.data || []).map(parseMangaDexItem),
    hasNextPage: offset + PAGE_SIZE < Math.min(data.total || 0, 10000),
  };
}

async function fetchRatings(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  try {
    const qs = ids.map(id => `manga[]=${id}`).join('&');
    const data = await getJson<{ statistics: Record<string, { rating?: { bayesian?: number } }> }>(
      `${API}/statistics/manga?${qs}`,
      { headers: HEADERS, timeoutMs: 5000, retries: 0 },
    );
    const out: Record<string, number> = {};
    for (const [id, s] of Object.entries(data.statistics || {}))
      out[id] = Math.round((s.rating?.bayesian || 0) * 10) / 10;
    return out;
  } catch {
    return {};
  }
}

export interface MangaDexChapterItem {
  id: string;
  attributes: {
    chapter: string | null;
    volume?: string | null;
    title?: string | null;
    publishAt?: string;
    readableAt?: string;
    pages?: number;
    externalUrl?: string | null;
    translatedLanguage?: string;
  };
  relationships?: MangaDexRelationship[];
}

/** Keeps one translation per chapter number (prefers RU), skips external-only chapters. Newest first. */
export function normalizeMangaDexChapters(mangaId: string, items: MangaDexChapterItem[]): SChapter[] {
  const byKey = new Map<string, MangaDexChapterItem>();
  for (const ch of items) {
    if (ch.attributes.externalUrl || (ch.attributes.pages ?? 1) === 0) continue;
    const key = ch.attributes.chapter ?? `oneshot-${ch.id}`;
    const existing = byKey.get(key);
    if (!existing || (existing.attributes.translatedLanguage !== 'ru' && ch.attributes.translatedLanguage === 'ru')) {
      byKey.set(key, ch);
    }
  }
  return Array.from(byKey.values())
    .map(ch => {
      const num = parseFloat(ch.attributes.chapter || '0') || 0;
      const vol = ch.attributes.volume ? parseInt(ch.attributes.volume, 10) : undefined;
      const lang = ch.attributes.translatedLanguage === 'en' ? ' [EN]' : '';
      const base = ch.attributes.chapter ? `Глава ${ch.attributes.chapter}` : 'Ваншот';
      return {
        id: ch.id,
        mangaId,
        sourceId: 'mangadex',
        number: num,
        volume: Number.isFinite(vol) ? vol : undefined,
        title: `${base}${ch.attributes.title ? `: ${ch.attributes.title}` : ''}${lang}`,
        releaseDate: toIsoDate(ch.attributes.readableAt || ch.attributes.publishAt),
        scanlationGroup: ch.relationships?.find(r => r.type === 'scanlation_group')?.attributes?.name,
        pagesCount: ch.attributes.pages || undefined,
      } satisfies SChapter;
    })
    .sort((a, b) => b.number - a.number);
}

export const mangadexSource: MangaSource = {
  meta: {
    id: 'mangadex',
    name: 'MangaDex',
    lang: 'ru/en',
    baseUrl: 'https://mangadex.org',
    isOnline: true,
    supportsSearch: true,
  },
  imageReferer: 'https://mangadex.org/',
  imageHosts: [/(^|\.)mangadex\.org$/, /(^|\.)mangadex\.network$/],

  async list(sort: SortMode, page: number) {
    const order = sort === 'latest' ? 'order[latestUploadedChapter]=desc' : 'order[followedCount]=desc';
    const res = await listQuery(order, page);
    const ratings = await fetchRatings(res.items.map(m => m.id.split('~')[1]));
    res.items.forEach(m => (m.rating = ratings[m.id.split('~')[1]] || 0));
    return res;
  },

  async search(query: string, page: number) {
    return listQuery(`title=${encodeURIComponent(query)}&order[relevance]=desc`, page);
  },

  async details(slug: string) {
    const data = await getJson<{ data: MangaDexItem }>(
      `${API}/manga/${encodeURIComponent(slug)}?includes[]=cover_art&includes[]=author&includes[]=artist`,
      { headers: HEADERS },
    );
    const manga = parseMangaDexItem(data.data);
    manga.rating = (await fetchRatings([slug]))[slug] || 0;
    return manga;
  },

  chapters(slug: string) {
    return cached(`md:ch:${slug}`, 5 * 60_000, async () => {
      const all: MangaDexChapterItem[] = [];
      for (let offset = 0; offset < 2000; offset += 500) {
        const data = await getJson<{ data: MangaDexChapterItem[]; total: number }>(
          `${API}/manga/${encodeURIComponent(slug)}/feed?translatedLanguage[]=ru&translatedLanguage[]=en&order[chapter]=desc&limit=500&offset=${offset}&includes[]=scanlation_group&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic`,
          { headers: HEADERS },
        );
        all.push(...(data.data || []));
        if (offset + 500 >= (data.total || 0)) break;
      }
      return normalizeMangaDexChapters(makeMangaId('mangadex', slug), all);
    });
  },

  async pages(_slug: string, chapterId: string) {
    const data = await getJson<{
      baseUrl: string;
      chapter: { hash: string; data: string[]; dataSaver: string[] };
    }>(`${API}/at-home/server/${encodeURIComponent(chapterId)}`, { headers: HEADERS });
    const { baseUrl, chapter } = data;
    return (chapter?.data || []).map((file, idx): Page => ({
      index: idx + 1,
      imageUrl: `${baseUrl}/data/${chapter.hash}/${file}`,
      fallbackUrl: chapter.dataSaver?.[idx]
        ? `${baseUrl}/data-saver/${chapter.hash}/${chapter.dataSaver[idx]}`
        : undefined,
    }));
  },
};
