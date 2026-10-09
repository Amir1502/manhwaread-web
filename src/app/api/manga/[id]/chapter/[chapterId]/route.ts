import { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api';
import { findNeighbours, getChapterPages, getMangaById, getMangaChapters } from '@/lib/sources';

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string; chapterId: string }> }) {
  const { id, chapterId } = await context.params;

  try {
    const [pages, chapters, manga] = await Promise.all([
      getChapterPages(id, chapterId),
      getMangaChapters(id).catch(() => []),
      getMangaById(id).catch(() => null),
    ]);
    const { current, prev, next } = findNeighbours(chapters, chapterId);

    return jsonOk(
      {
        pages,
        manga: manga
          ? { id: manga.id, title: manga.title, coverUrl: manga.coverUrl, sourceId: manga.sourceId, type: manga.type }
          : null,
        prevChapter: prev,
        nextChapter: next,
        currentChapter: current,
        totalChapters: chapters.length,
      },
      600,
    );
  } catch (err) {
    return jsonError(err);
  }
}
