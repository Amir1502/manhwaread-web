import { MangaListResult, Page, SChapter, SManga, SortMode } from '../types';
import { MangaSource, makeMangaId, proxied } from './base';
import { SourceError, cached, getJson, toIsoDate } from './http';

/** MangaLib (LibSocial) public API. Site-Id 1 = mangalib. */
const API = process.env.MANGALIB_API_BASE || 'https://api.cdnlibs.org/api';
const SITE = 'https://mangalib.me';
const HEADERS = { 'Site-Id': '1', Referer: `${SITE}/`, Origin: SITE };
/** Image servers (from /api/constants?fields[]=imageServers). The first one is tried first in the reader. */
const IMAGE_SERVERS = ['https://img3.cdnlibs.org', 'https://img2.imglib.info'];

interface LibCover {
  thumbnail?: string;
  default?: string;
  md?: string;
}
export interface LibMangaItem {
  id: number;
  name: string;
  rus_name?: string | null;
  eng_name?: string | null;
  slug_url: string;
  cover?: LibCover;
  ageRestriction?: { id: number; label: string };
  type?: { id: number; label: string };
  rating?: { average?: string | number; votes?: number };
  status?: { id: number; label: string };
  summary?: unknown;
  genres?: Array<{ name: string }>;
  tags?: Array<{ name: string }>;
  authors?: Array<{ name: string; rus_name?: string | null }>;
  artists?: Array<{ name: string; rus_name?: string | null }>;
  otherNames?: string[];
  items_count?: { uploaded?: number };
  last_item_at?: string;
}

interface LibChapterItem {
  id: number;
  index?: number;
  volume: string;
  number: string;
  name?: string | null;
  branches?: Array<{
    id: number;
    branch_id: number | null;
    created_at?: string;
    teams?: Array<{ name: string }>;
    restricted_view?: { is_open?: boolean };
  }>;
}

// 1 онгоинг, 2 завершён, 3 анонс, 4 приостановлен, 5 выпуск прекращён
const STATUS: Record<number, SManga['status']> = { 1: 'ONGOING', 2: 'COMPLETED', 4: 'HIATUS', 5: 'CANCELLED' };

/** Summary arrives either as plain text or as a ProseMirror document. */
export function libSummaryToText(summary: unknown): string {
  if (!summary) return '';
  if (typeof summary === 'string') return summary.trim();
  const out: string[] = [];
  const walk = (node: unknown): string => {
    if (!node || typeof node !== 'object') return '';
    const n = node as { type?: string; text?: string; content?: unknown[] };
    if (n.type === 'text') return n.text || '';
    if (n.type === 'hardBreak') return '\n';
    return (n.content || []).map(walk).join('');
  };
  const root = summary as { content?: unknown[] };
  for (const block of root.content || []) out.push(walk(block));
  return out.filter(Boolean).join('\n\n').trim();
}

export function parseLibManga(it: LibMangaItem): SManga {
  const rating = Number(it.rating?.average ?? 0);
  return {
    id: makeMangaId('mangalib', it.slug_url),
    sourceId: 'mangalib',
    title: it.rus_name || it.eng_name || it.name,
    altTitle: it.eng_name && it.eng_name !== it.rus_name ? it.eng_name : it.name !== it.rus_name ? it.name : undefined,
    description: libSummaryToText(it.summary),
    coverUrl: proxied(it.cover?.default || it.cover?.md || it.cover?.thumbnail, 'mangalib'),
    authors: [...(it.authors || []), ...(it.artists || [])]
      .map(a => a.rus_name || a.name)
      .filter((v, i, arr) => v && arr.indexOf(v) === i),
    status: STATUS[it.status?.id ?? -1] || 'UNKNOWN',
    rating: Number.isFinite(rating) ? Math.round(rating * 10) / 10 : 0,
    genres: [...(it.genres || []), ...(it.tags || [])].map(g => g.name),
    type: it.type?.label,
    ageRating: it.ageRestriction?.label && it.ageRestriction.label !== 'Нет' ? it.ageRestriction.label : undefined,
    isAdult: (it.ageRestriction?.id ?? 0) >= 4,
    totalChapters: it.items_count?.uploaded,
    lastUpdated: toIsoDate(it.last_item_at),
    sourceUrl: `${SITE}/ru/manga/${it.slug_url}`,
  };
}

/** Chapter id format: `{volume}_{number}` or `{volume}_{number}_{branchId}`. */
export function encodeLibChapterId(volume: string, number: string, branchId?: number | null): string {
  return [volume, number, branchId ?? ''].filter(v => v !== '').join('_');
}

export function decodeLibChapterId(id: string): { volume: string; number: string; branchId?: string } {
  const [volume, number, branchId] = id.split('_');
  if (!volume || !number) throw new SourceError('Некорректный id главы MangaLib', 400);
  return { volume, number, branchId };
}

export function parseLibChapters(mangaId: string, items: LibChapterItem[]): SChapter[] {
  const out: SChapter[] = [];
  for (const ch of items) {
    const branch = ch.branches?.find(b => b.restricted_view?.is_open !== false) || ch.branches?.[0];
    const vol = parseInt(ch.volume, 10);
    out.push({
      id: encodeLibChapterId(ch.volume, ch.number, branch?.branch_id),
      mangaId,
      sourceId: 'mangalib',
      number: parseFloat(ch.number) || 0,
      volume: Number.isFinite(vol) ? vol : undefined,
      title: `Том ${ch.volume} Глава ${ch.number}${ch.name ? `: ${ch.name}` : ''}`,
      releaseDate: toIsoDate(branch?.created_at),
      scanlationGroup: branch?.teams?.[0]?.name,
    });
  }
  // API returns oldest first; keep source order (handles 10.5 / extra chapters correctly).
  return out.reverse();
}

async function listQuery(params: string, page: number): Promise<MangaListResult> {
  const data = await getJson<{ data: LibMangaItem[]; meta?: { has_next_page?: boolean } }>(
    `${API}/manga?site_id[]=1&fields[]=rate&fields[]=rate_avg&page=${page}&${params}`,
    { headers: HEADERS },
  );
  return {
    items: (data.data || []).map(parseLibManga),
    hasNextPage: Boolean(data.meta?.has_next_page),
  };
}

export const mangalibSource: MangaSource = {
  meta: {
    id: 'mangalib',
    name: 'MangaLib',
    lang: 'ru',
    baseUrl: SITE,
    isOnline: true,
    supportsSearch: true,
    note: 'Лицензированные тайтлы MangaLib закрыты без авторизации — у них нет глав.',
  },
  imageReferer: `${SITE}/`,
  imageHosts: [/(^|\.)cdnlibs\.org$/, /(^|\.)imglib\.info$/, /(^|\.)mangalib\.(me|org)$/],

  list(sort: SortMode, page: number) {
    const by = sort === 'latest' ? 'last_chapter_at' : 'views';
    return listQuery(`sort_by=${by}&sort_type=desc`, page);
  },

  search(query: string, page: number) {
    return listQuery(`q=${encodeURIComponent(query)}`, page);
  },

  details(slug: string) {
    return cached(`ml:det:${slug}`, 10 * 60_000, async () => {
      const fields = [
        'rate',
        'rate_avg',
        'summary',
        'genres',
        'tags',
        'authors',
        'artists',
        'otherNames',
        'chap_count',
        'close_view',
      ];
      const data = await getJson<{ data: LibMangaItem }>(
        `${API}/manga/${encodeURIComponent(slug)}?${fields.map(f => `fields[]=${f}`).join('&')}`,
        { headers: HEADERS },
      );
      return parseLibManga(data.data);
    });
  },

  chapters(slug: string) {
    return cached(`ml:ch:${slug}`, 5 * 60_000, async () => {
      const data = await getJson<{ data: LibChapterItem[] }>(`${API}/manga/${encodeURIComponent(slug)}/chapters`, {
        headers: HEADERS,
      });
      return parseLibChapters(makeMangaId('mangalib', slug), data.data || []);
    });
  },

  async pages(slug: string, chapterId: string) {
    const { volume, number, branchId } = decodeLibChapterId(chapterId);
    const qs = new URLSearchParams({ number, volume });
    if (branchId) qs.set('branch_id', branchId);
    const data = await getJson<{ data: { pages?: Array<{ url: string; width?: number; height?: number }> } }>(
      `${API}/manga/${encodeURIComponent(slug)}/chapter?${qs}`,
      { headers: HEADERS },
    );
    const pages = data.data?.pages || [];
    if (pages.length === 0) throw new SourceError('Глава недоступна без авторизации на MangaLib', 403);
    return pages.map((p, i): Page => {
      const path = p.url.startsWith('/') ? p.url : `/${p.url}`;
      return {
        index: i + 1,
        imageUrl: proxied(`${IMAGE_SERVERS[0]}${path}`, 'mangalib'),
        fallbackUrl: proxied(`${IMAGE_SERVERS[1]}${path}`, 'mangalib'),
        width: p.width,
        height: p.height,
      };
    });
  },
};
