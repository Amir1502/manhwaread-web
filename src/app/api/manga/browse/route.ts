import { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api';
import { browse, listSources } from '@/lib/sources';
import { SortMode, SortOrder } from '@/lib/types';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const adult = sp.get('adult') === '1';
  const page = Math.min(Math.max(parseInt(sp.get('page') || '1', 10) || 1, 1), 500);
  const sort = (sp.get('sort') || 'popular') as SortMode;
  const sortOrder = (sp.get('sortOrder') === 'asc' ? 'asc' : 'desc') as SortOrder;

  const parseList = (k: string) => sp.get(k)?.split(',').map(s => s.trim()).filter(Boolean);
  const parseIntOpt = (k: string) => {
    const v = sp.get(k);
    if (!v) return undefined;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : undefined;
  };
  const parseFloatOpt = (k: string) => {
    const v = sp.get(k);
    if (!v) return undefined;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  };

  try {
    const result = await browse({
      source: sp.get('source') || 'all',
      query: (sp.get('q') || '').slice(0, 120),
      page,
      sort,
      sortOrder,
      adult,
      types: parseList('types'),
      formats: parseList('formats'),
      status: parseList('status'),
      ageRatings: parseList('ageRatings'),
      genres: parseList('genres'),
      tags: parseList('tags'),
      minChapters: parseIntOpt('minChapters'),
      maxChapters: parseIntOpt('maxChapters'),
      minRating: parseFloatOpt('minRating'),
      maxRating: parseFloatOpt('maxRating'),
      minYear: parseIntOpt('minYear'),
      maxYear: parseIntOpt('maxYear'),
      removeEmptyChapters: sp.get('includeEmpty') === '1' ? false : true,
    });
    return jsonOk(
      {
        mangas: result.items,
        hasNextPage: result.hasNextPage,
        errors: result.errors,
        page,
        sources: listSources(adult),
      },
      300,
    );
  } catch (err) {
    return jsonError(err);
  }
}
