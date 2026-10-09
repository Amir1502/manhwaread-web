import { SManga, SChapter, Page } from '../types';

const MANGADEX_API = 'https://api.mangadex.org';
const MANGADEX_UPLOADS = 'https://uploads.mangadex.org';
const TIMEOUT_MS = 6000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'User-Agent': 'ManhwaReadWeb/1.0.0 (https://github.com/Amir1502/manhwaread)',
        ...(init?.headers || {})
      }
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

interface MangaDexRelationship {
  id: string;
  type: string;
  attributes?: {
    fileName?: string;
    name?: string;
  };
}

interface MangaDexItem {
  id: string;
  type: string;
  attributes: {
    title: Record<string, string>;
    altTitles?: Array<Record<string, string>>;
    description?: Record<string, string>;
    status?: string;
    tags?: Array<{ attributes: { name: Record<string, string> } }>;
    updatedAt?: string;
  };
  relationships?: MangaDexRelationship[];
}

export function parseMangaDexItem(item: MangaDexItem): SManga {
  const title = item.attributes.title.ru || item.attributes.title.en || Object.values(item.attributes.title)[0] || 'Без названия';
  
  let altTitle: string | undefined;
  if (item.attributes.altTitles && item.attributes.altTitles.length > 0) {
    const firstAlt = item.attributes.altTitles[0];
    altTitle = firstAlt.ru || firstAlt.en || Object.values(firstAlt)[0];
  }

  const desc = item.attributes.description?.ru || item.attributes.description?.en || Object.values(item.attributes.description || {})[0] || 'Описание отсутствует.';
  
  const coverRel = item.relationships?.find(r => r.type === 'cover_art');
  const coverFileName = coverRel?.attributes?.fileName;
  const coverUrl = coverFileName 
    ? `${MANGADEX_UPLOADS}/covers/${item.id}/${coverFileName}.512.jpg`
    : 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80';

  const authorRels = item.relationships?.filter(r => r.type === 'author' || r.type === 'artist') || [];
  const authors = authorRels.map(a => a.attributes?.name || 'Автор неизвестен').filter(Boolean);

  const genres = (item.attributes.tags || [])
    .map(t => t.attributes.name.ru || t.attributes.name.en || '')
    .filter(Boolean)
    .slice(0, 5);

  let status: SManga['status'] = 'UNKNOWN';
  if (item.attributes.status === 'ongoing') status = 'ONGOING';
  else if (item.attributes.status === 'completed') status = 'COMPLETED';
  else if (item.attributes.status === 'hiatus') status = 'HIATUS';

  return {
    id: `md-${item.id}`,
    sourceId: 'mangadex',
    title,
    altTitle,
    description: desc,
    coverUrl,
    authors: authors.length > 0 ? authors : ['MangaDex'],
    status,
    rating: 9.4,
    genres: genres.length > 0 ? genres : ['Манхва', 'Экшен'],
    lastUpdated: item.attributes.updatedAt?.split('T')[0] || '2026-10-09'
  };
}

export async function fetchMangaDexPopular(limit = 20): Promise<SManga[]> {
  try {
    const url = `${MANGADEX_API}/manga?limit=${limit}&includes[]=cover_art&includes[]=author&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive&hasAvailableChapters=true`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`MangaDex returned ${res.status}`);
    const data = await res.json();
    return (data.data || []).map(parseMangaDexItem);
  } catch (err) {
    console.warn('MangaDex popular fetch failed, returning empty:', err);
    return [];
  }
}

export async function searchMangaDex(query: string, limit = 20): Promise<SManga[]> {
  try {
    const encoded = encodeURIComponent(query);
    const url = `${MANGADEX_API}/manga?title=${encoded}&limit=${limit}&includes[]=cover_art&includes[]=author&contentRating[]=safe&contentRating[]=suggestive`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`MangaDex search returned ${res.status}`);
    const data = await res.json();
    return (data.data || []).map(parseMangaDexItem);
  } catch (err) {
    console.warn('MangaDex search failed:', err);
    return [];
  }
}

export async function fetchMangaDexDetails(rawId: string): Promise<SManga | null> {
  const mangaId = rawId.replace(/^md-/, '');
  try {
    const url = `${MANGADEX_API}/manga/${mangaId}?includes[]=cover_art&includes[]=author`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const data = await res.json();
    return parseMangaDexItem(data.data);
  } catch (err) {
    console.warn('MangaDex details failed:', err);
    return null;
  }
}

interface MangaDexChapterItem {
  id: string;
  attributes: {
    chapter: string;
    title?: string;
    publishAt?: string;
    pages?: number;
  };
  relationships?: MangaDexRelationship[];
}

export async function fetchMangaDexChapters(rawId: string): Promise<SChapter[]> {
  const mangaId = rawId.replace(/^md-/, '');
  try {
    // Look for Russian chapters first, then English
    const url = `${MANGADEX_API}/manga/${mangaId}/feed?translatedLanguage[]=ru&translatedLanguage[]=en&order[chapter]=desc&limit=100`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = await res.json();
    const chapters: MangaDexChapterItem[] = data.data || [];

    return chapters.map(ch => {
      const num = parseFloat(ch.attributes.chapter) || 0;
      const title = ch.attributes.title 
        ? `Глава ${ch.attributes.chapter}: ${ch.attributes.title}`
        : `Глава ${ch.attributes.chapter || '1'}`;
      const group = ch.relationships?.find(r => r.type === 'scanlation_group')?.attributes?.name;
      
      return {
        id: `md-ch-${ch.id}`,
        mangaId: rawId,
        sourceId: 'mangadex',
        number: num,
        title,
        releaseDate: ch.attributes.publishAt?.split('T')[0] || '2026-10-09',
        scanlationGroup: group || 'MangaDex',
        pagesCount: ch.attributes.pages || 0
      };
    });
  } catch (err) {
    console.warn('MangaDex chapters fetch failed:', err);
    return [];
  }
}

export async function fetchMangaDexPages(chapterRawId: string): Promise<Page[]> {
  const chapterId = chapterRawId.replace(/^md-ch-/, '');
  try {
    const url = `${MANGADEX_API}/at-home/server/${chapterId}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = await res.json();
    const baseUrl = data.baseUrl;
    const hash = data.chapter?.hash;
    const files: string[] = data.chapter?.data || [];

    return files.map((fileName, idx) => ({
      index: idx + 1,
      imageUrl: `${baseUrl}/data/${hash}/${fileName}`,
      fallbackUrl: `${baseUrl}/data-saver/${hash}/${data.chapter?.dataSaver?.[idx] || fileName}`,
    }));
  } catch (err) {
    console.warn('MangaDex chapter pages failed:', err);
    return [];
  }
}
