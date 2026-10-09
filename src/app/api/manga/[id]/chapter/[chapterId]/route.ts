import { NextRequest, NextResponse } from 'next/server';
import { getChapterPages, getMangaChapters } from '@/lib/sources';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; chapterId: string }> }
) {
  const { id, chapterId } = await context.params;

  try {
    const pages = await getChapterPages(id, chapterId);
    const allChapters = await getMangaChapters(id);

    const currentIdx = allChapters.findIndex(c => c.id === chapterId);
    let prevChapter = null;
    let nextChapter = null;

    if (currentIdx >= 0) {
      // chapters are sorted descending (higher number first)
      if (currentIdx > 0) {
        nextChapter = allChapters[currentIdx - 1]; // next higher chapter
      }
      if (currentIdx < allChapters.length - 1) {
        prevChapter = allChapters[currentIdx + 1]; // previous lower chapter
      }
    }

    return NextResponse.json({
      success: true,
      pages,
      prevChapter,
      nextChapter,
      currentChapter: allChapters[currentIdx] || null,
      totalChapters: allChapters.length
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
