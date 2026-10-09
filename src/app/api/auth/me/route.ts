import { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api';
import { getUserFromRequest, toPublicUser } from '@/lib/server/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return jsonOk({ user: null });
    }
    return jsonOk({
      user: toPublicUser(user),
      bookmarksCount: user.bookmarks?.length || 0,
      historyCount: Object.keys(user.history || {}).length,
    });
  } catch (err) {
    return jsonError(err);
  }
}
