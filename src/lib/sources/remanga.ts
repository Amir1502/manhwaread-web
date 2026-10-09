import { MangaListResult, Page, SChapter, SManga, SortMode } from '../types';
import { MangaSource, makeMangaId, proxied } from './base';
import { SourceError, cached, getJson, toIsoDate } from './http';

/**
 * ReManga v2 API. DDoS-Guard geo-blocks many non-RU/CIS IPs — set REMANGA_API_BASE
 * to a mirror/proxy (e.g. https://my-proxy.example/remanga-api) if requests return 403.
 */
const SITE = 'https://remanga.org';
const API_ROOT = process.env.REMANGA_API_BASE || 'https://api.remanga.org';
const API = `${API_ROOT}/api`;
const HEADERS = { Referer: `${SITE}/`, Origin: SITE };
const PAGE_SIZE = 30;

interface RmNamed {
  id?: number;
  name?: string;
}
interface RmCover {
  high?: string;
  mid?: string;
  low?: string;
}
export interface RmTitle {
  id: number;
  dir: string;
  main_name?: string;
  rus_name?: string;
  secondary_name?: string;
  en_name?: string;
  another_name?: string;
  description?: string;
  cover?: RmCover;
  img?: RmCover;
  avg_rating?: string | number;
  rating?: string | number;
  type?: RmNamed | string;
  status?: RmNamed;
  age_limit?: RmNamed | number;
  genres?: RmNamed[];
  categories?: RmNamed[];
  branches?: Array<{ id: number; count_chapters?: number; publishers?: Array<{ name?: string }> }>;
  count_chapters?: number;
  issue_year?: number;
  publishers?: Array<{ name?: string }>;
}

interface RmChapter {
  id: number;
  chapter: string | number;
  tome?: number;
  name?: string | null;
  upload_date?: string;
  is_paid?: boolean;
  is_bought?: boolean | null;
  publishers?: Array<{ name?: string }>;
}

type Wrapped<T> = T & { content?: T; results?: unknown };

const STATUS: Record<number, SManga['status']> = { 1: 'COMPLETED', 2: 'ONGOING', 3: 'HIATUS', 4: 'CANCELLED' };

function abs(url?: string): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//.test(url)) return url;
  return `${API_ROOT}${url.startsWith('/') ? '' : '/'}${url}`;
}

function unwrap<T>(json: Wrapped<T>): T {
  return (json && typeof json === 'object' && 'content' in json && json.content ? json.content : json) as T;
}

export function parseRemangaTitle(t: RmTitle): SManga {
  const cover = t.cover || t.img || {};
  const rating = Number(t.avg_rating ?? t.rating ?? 0);
  const ageId = typeof t.age_limit === 'number' ? t.age_limit : t.age_limit?.id;
  const typeName = typeof t.type === 'string' ? t.type : t.type?.name;
  return {
    id: makeMangaId('remanga', t.dir),
    sourceId: 'remanga',
    title: t.main_name || t.rus_name || t.secondary_name || t.en_name || t.dir,
    altTitle: t.secondary_name || t.en_name || undefined,
    description: (t.description || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim(),
    coverUrl: proxied(abs(cover.high || cover.mid || cover.low), 'remanga'),
    authors: Array.from(
      new Set(
        (t.publishers || t.branches?.flatMap(b => b.publishers || []) || [])
          .map(p => p.name)
          .filter((n): n is string => Boolean(n)),
      ),
    ),
    status: STATUS[t.status?.id ?? -1] || 'UNKNOWN',
    rating: Number.isFinite(rating) ? Math.round(rating * 10) / 10 : 0,
    genres: [...(t.genres || []), ...(t.categories || [])].map(g => g.name || '').filter(Boolean),
    type: typeName,
    ageRating: ageId === 2 ? '18+' : ageId === 1 ? '16+' : undefined,
    isAdult: ageId === 2,
    totalChapters: t.count_chapters,
    sourceUrl: `${SITE}/manga/${t.dir}`,
  };
}

export function parseRemangaChapters(mangaId: string, items: RmChapter[]): SChapter[] {
  return items
    .filter(c => !(c.is_paid && !c.is_bought))
    .map(c => {
      const num = typeof c.chapter === 'number' ? c.chapter : parseFloat(String(c.chapter)) || 0;
      return {
        id: String(c.id),
        mangaId,
        sourceId: 'remanga',
        number: num,
        volume: c.tome,
        title: `${c.tome ? `Том ${c.tome} ` : ''}Глава ${c.chapter}${c.name ? `: ${c.name}` : ''}`,
        releaseDate: toIsoDate(c.upload_date),
        scanlationGroup: c.publishers?.[0]?.name,
      } satisfies SChapter;
    });
}

async function listQuery(path: string, params: Record<string, string>, page: number): Promise<MangaListResult> {
  const qs = new URLSearchParams({ ...params, page: String(page), count: String(PAGE_SIZE) });
  const json = await getJson<Wrapped<{ results?: RmTitle[]; next?: string | null }> | RmTitle[]>(
    `${API}/v2/${path}?${qs}`,
    {
      headers: HEADERS,
    },
  );
  const list = Array.isArray(json) ? json : (json.results as RmTitle[]) || (unwrap(json) as unknown as RmTitle[]) || [];
  const items = (Array.isArray(list) ? list : []).filter(t => t && t.dir).map(parseRemangaTitle);
  const next = Array.isArray(json) ? undefined : json.next;
  return { items, hasNextPage: next !== undefined ? Boolean(next) : items.length >= PAGE_SIZE };
}

function fetchTitle(slug: string): Promise<RmTitle> {
  return cached(`rm:det:${slug}`, 10 * 60_000, async () => {
    const json = await getJson<Wrapped<RmTitle>>(`${API}/v2/titles/${encodeURIComponent(slug)}/`, { headers: HEADERS });
    const t = unwrap(json);
    if (!t?.dir) throw new SourceError('Тайтл не найден на ReManga', 404);
    return t;
  });
}

export const remangaSource: MangaSource = {
  meta: {
    id: 'remanga',
    name: 'ReManga',
    lang: 'ru',
    baseUrl: SITE,
    isOnline: true,
    supportsSearch: true,
    note: 'Платные главы скрыты. API может блокировать зарубежные IP (DDoS-Guard).',
  },
  imageReferer: `${SITE}/`,
  imageHosts: [/(^|\.)remanga\.org$/, /(^|\.)reimg\.org$/, /(^|\.)reimg2\.org$/, /(^|\.)remanga\.(ru|io)$/],

  list(sort: SortMode, page: number) {
    return listQuery('search/catalog/', { ordering: sort === 'latest' ? '-chapter_date' : '-rating' }, page);
  },

  search(query: string, page: number) {
    return listQuery('search/', { query }, page);
  },

  async details(slug: string) {
    return parseRemangaTitle(await fetchTitle(slug));
  },

  chapters(slug: string) {
    return cached(`rm:ch:${slug}`, 5 * 60_000, async () => {
      const title = await fetchTitle(slug);
      const branch = [...(title.branches || [])].sort((a, b) => (b.count_chapters || 0) - (a.count_chapters || 0))[0];
      if (!branch) return [];
      const all: RmChapter[] = [];
      for (let page = 1; page <= 20; page++) {
        const json = await getJson<Wrapped<{ results?: RmChapter[] }> | RmChapter[]>(
          `${API}/v2/titles/chapters/?branch_id=${branch.id}&ordering=-index&page=${page}&count=500`,
          { headers: HEADERS },
        );
        const batch = Array.isArray(json) ? json : json.results || (unwrap(json) as unknown as RmChapter[]);
        if (!Array.isArray(batch) || batch.length === 0) break;
        all.push(...batch);
        if (batch.length < 500) break;
      }
      return parseRemangaChapters(makeMangaId('remanga', slug), all);
    });
  },

  async pages(_slug: string, chapterId: string) {
    const json = await getJson<Wrapped<{ pages?: unknown[]; is_paid?: boolean; pub_date?: string }>>(
      `${API}/v2/titles/chapters/${encodeURIComponent(chapterId)}/`,
      { headers: HEADERS },
    );
    const ch = unwrap(json);
    if (!ch?.pages) throw new SourceError(ch?.is_paid ? 'Глава платная' : 'Глава недоступна', 403);
    const flat: Array<{ link: string; width?: number; height?: number }> = [];
    for (const item of ch.pages) {
      if (Array.isArray(item)) flat.push(...item);
      else if (item && typeof item === 'object') flat.push(item as { link: string });
    }
    return flat
      .filter(p => p.link)
      .map((p, i): Page => ({
        index: i + 1,
        imageUrl: proxied(abs(p.link), 'remanga'),
        width: p.width,
        height: p.height,
      }));
  },
};
