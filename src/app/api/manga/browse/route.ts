import { NextRequest, NextResponse } from 'next/server';
import { AVAILABLE_SOURCES, getPopularManga, searchManga } from '@/lib/sources';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q') || '';
  const source = searchParams.get('source') || 'all';

  try {
    let mangas;
    if (q.trim()) {
      mangas = await searchManga(q, source);
    } else {
      mangas = await getPopularManga(source);
    }

    return NextResponse.json({
      success: true,
      mangas,
      sources: AVAILABLE_SOURCES
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
