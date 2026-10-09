import { MangaListResult, Page, SChapter, SManga, SortMode, SourceMeta } from '../types';

export interface MangaSource {
  meta: SourceMeta;
  /** Referer sent by the image proxy for this source's images. */
  imageReferer?: string;
  /** Hosts the image proxy may fetch for this source. */
  imageHosts: RegExp[];
  list(sort: SortMode, page: number): Promise<MangaListResult>;
  search(query: string, page: number): Promise<MangaListResult>;
  details(slug: string): Promise<SManga>;
  /** Chapters ordered newest first. */
  chapters(slug: string): Promise<SChapter[]>;
  pages(slug: string, chapterId: string): Promise<Page[]>;
}

export const ID_SEPARATOR = '~';

export function makeMangaId(sourceId: string, slug: string): string {
  return `${sourceId}${ID_SEPARATOR}${slug}`;
}

/** Wrap a remote image URL so it is loaded through our proxy (adds Referer, hides hotlink protection). */
export function proxied(url: string | undefined | null, sourceId: string): string {
  if (!url) return '';
  if (url.startsWith('/')) return url;
  return `/api/proxy-image?src=${encodeURIComponent(sourceId)}&url=${encodeURIComponent(url)}`;
}
