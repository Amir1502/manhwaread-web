import { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api';
import { browse, listSources } from '@/lib/sources';
import { SortMode } from '@/lib/types';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const adult = sp.get('adult') === '1';
  const page = Math.min(Math.max(parseInt(sp.get('page') || '1', 10) || 1, 1), 500);
  const sort: SortMode = sp.get('sort') === 'latest' ? 'latest' : 'popular';

  try {
    const result = await browse({
      source: sp.get('source') || 'all',
      query: (sp.get('q') || '').slice(0, 120),
      page,
      sort,
      adult,
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
