import { MangaListResult, Page, SChapter, SManga, SortMode, SourceMeta } from '../types';
import { ID_SEPARATOR, MangaSource } from './base';
import { DEMO_SLUG, LEGACY_DEMO_IDS, demoSource } from './demo';
import { SourceError } from './http';
import { manga18fxSource } from './manga18fx';
import { mangabuffSource } from './mangabuff';
import { mangadexSource } from './mangadex';
import { mangalibSource } from './mangalib';
import { mangamirSource } from './mangamir';
import { remangaSource } from './remanga';

export const SOURCES: Record<string, MangaSource> = {
  mangalib: mangalibSource,
  remanga: remangaSource,
  mangamir: mangamirSource,
  mangabuff: mangabuffSource,
  mangadex: mangadexSource,
  manga18fx: manga18fxSource,
  demo: demoSource,
};

export const ALL_SOURCE_META: SourceMeta = {
  id: 'all',
  name: 'Все источники',
  lang: 'ru',
  baseUrl: '',
  isOnline: true,
  supportsSearch: true,
};

export function listSources(includeAdult = false): SourceMeta[] {
  return [
    ALL_SOURCE_META,
    ...Object.values(SOURCES)
      .map(s => s.meta)
      .filter(m => m.id !== 'demo' && (includeAdult || !m.isAdult)),
  ];
}

export function getSource(id: string): MangaSource {
  const src = SOURCES[id];
  if (!src) throw new SourceError(`Неизвестный источник: ${id}`, 404);
  return src;
}

/** Resolves a global manga id (incl. legacy `md-<uuid>` and old curated ids) into source + slug. */
export function parseMangaId(rawId: string): { source: MangaSource; slug: string } {
  const id = decodeURIComponent(rawId);
  const sep = id.indexOf(ID_SEPARATOR);
  if (sep > 0) return { source: getSource(id.slice(0, sep)), slug: id.slice(sep + 1) };
  if (id.startsWith('md-')) return { source: mangadexSource, slug: id.slice(3) };
  if (LEGACY_DEMO_IDS.includes(id) || id === DEMO_SLUG) return { source: demoSource, slug: DEMO_SLUG };
  throw new SourceError('Тайтл не найден', 404);
}

function normalizeChapterId(rawId: string): string {
  const id = decodeURIComponent(rawId);
  return id.startsWith('md-ch-') ? id.slice(6) : id;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new SourceError(`${label}: таймаут`)), ms);
    p.then(
      v => {
        clearTimeout(t);
        resolve(v);
      },
      e => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export interface BrowseParams {
  source?: string;
  query?: string;
  page?: number;
  sort?: SortMode;
  adult?: boolean;
}

export interface BrowseResult extends MangaListResult {
  errors: Array<{ source: string; message: string }>;
}

export async function browse({
  source = 'all',
  query = '',
  page = 1,
  sort = 'popular',
  adult = false,
}: BrowseParams): Promise<BrowseResult> {
  const q = query.trim();
  const targets =
    source === 'all'
      ? Object.values(SOURCES).filter(s => s.meta.id !== 'demo' && (adult || !s.meta.isAdult))
      : [getSource(source)];

  if (!adult && targets.some(t => t.meta.isAdult)) {
    throw new SourceError('Источник 18+ доступен только после включения взрослого контента', 403);
  }

  const settled = await Promise.allSettled(
    targets.map(s =>
      withTimeout(q ? s.search(q, page) : s.list(sort, page), source === 'all' ? 9000 : 15000, s.meta.name),
    ),
  );

  const lists: SManga[][] = [];
  const errors: BrowseResult['errors'] = [];
  let hasNextPage = false;
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      lists.push(r.value.items.filter(m => adult || !m.isAdult));
      hasNextPage ||= r.value.hasNextPage;
    } else {
      errors.push({
        source: targets[i].meta.id,
        message: r.reason instanceof Error ? r.reason.message : String(r.reason),
      });
    }
  });

  // Round-robin merge so one source doesn't dominate the first screen.
  const items: SManga[] = [];
  const seen = new Set<string>();
  for (let i = 0; lists.some(l => i < l.length); i++) {
    for (const l of lists) {
      const m = l[i];
      if (m && !seen.has(m.id)) {
        seen.add(m.id);
        items.push(m);
      }
    }
  }

  if (errors.length === targets.length && targets.length > 0) {
    throw new SourceError(errors.map(e => `${e.source}: ${e.message}`).join('; '), 502);
  }
  return { items, hasNextPage, errors };
}

export async function getMangaById(id: string): Promise<SManga | null> {
  try {
    const { source, slug } = parseMangaId(id);
    return await source.details(slug);
  } catch (err) {
    if (err instanceof SourceError && err.status === 404) return null;
    throw err;
  }
}

export async function getMangaChapters(id: string): Promise<SChapter[]> {
  const { source, slug } = parseMangaId(id);
  return source.chapters(slug);
}

export async function getChapterPages(mangaId: string, chapterId: string): Promise<Page[]> {
  const { source, slug } = parseMangaId(mangaId);
  return source.pages(slug, normalizeChapterId(chapterId));
}

/** Chapters are newest-first: "next" is the newer one (lower index). */
export function findNeighbours(chapters: SChapter[], chapterId: string) {
  const id = normalizeChapterId(chapterId);
  const idx = chapters.findIndex(c => c.id === id);
  return {
    current: idx >= 0 ? chapters[idx] : null,
    next: idx > 0 ? chapters[idx - 1] : null,
    prev: idx >= 0 && idx < chapters.length - 1 ? chapters[idx + 1] : null,
  };
}

export function isAllowedImageHost(sourceId: string, host: string): MangaSource | null {
  const src = SOURCES[sourceId];
  if (!src) return null;
  return src.imageHosts.some(re => re.test(host)) ? src : null;
}

export { SourceError };
