import { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api';
import { getUserFromRequest, toPublicUser } from '@/lib/server/auth';
import { saveUser } from '@/lib/server/db';

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return jsonError('Требуется авторизация', 401);
    }

    const body = await req.json();
    const { bookmarks, history, expGain } = body;

    let modified = false;

    if (Array.isArray(bookmarks)) {
      // Merge unique bookmarks
      const existingMap = new Map((user.bookmarks || []).map(b => [b.mangaId, b]));
      for (const item of bookmarks) {
        if (item && item.mangaId) {
          existingMap.set(item.mangaId, item);
        }
      }
      user.bookmarks = Array.from(existingMap.values());
      modified = true;
    }

    if (history && typeof history === 'object') {
      user.history = { ...(user.history || {}), ...history };
      modified = true;
    }

    if (typeof expGain === 'number' && expGain > 0 && expGain <= 100) {
      user.exp = (user.exp || 0) + expGain;
      modified = true;
    }

    if (modified) {
      saveUser(user);
    }

    return jsonOk({
      user: toPublicUser(user),
      bookmarks: user.bookmarks,
      history: user.history,
    });
  } catch (err) {
    return jsonError(err);
  }
}
