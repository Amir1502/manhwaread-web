import { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api';
import { SourceError, getMangaById, getMangaChapters } from '@/lib/sources';
import { SChapter } from '@/lib/types';

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const [manga, chaptersResult] = await Promise.all([
      getMangaById(id),
      getMangaChapters(id).then(
        (c): { chapters: SChapter[]; error?: string } => ({ chapters: c }),
        (e: unknown) => ({ chapters: [], error: e instanceof Error ? e.message : String(e) }),
      ),
    ]);
    if (!manga) return jsonError(new SourceError('Тайтл не найден', 404));

    return jsonOk({ manga, chapters: chaptersResult.chapters, chaptersError: chaptersResult.error }, 300);
  } catch (err) {
    return jsonError(err);
  }
}
