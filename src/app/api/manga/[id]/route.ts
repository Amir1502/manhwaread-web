import { NextRequest, NextResponse } from 'next/server';
import { getMangaById, getMangaChapters } from '@/lib/sources';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const manga = await getMangaById(id);
    if (!manga) {
      return NextResponse.json(
        { success: false, error: 'Manga not found' },
        { status: 404 }
      );
    }

    const chapters = await getMangaChapters(id);

    return NextResponse.json({
      success: true,
      manga,
      chapters,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
