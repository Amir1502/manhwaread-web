import { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api';
import { getUserFromRequest } from '@/lib/server/auth';
import { updateComment } from '@/lib/server/db';

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return jsonError('Войдите в аккаунт для голосования', 401);
    }

    const body = await req.json();
    const { commentId, type } = body; // type: 'like' | 'dislike'

    if (!commentId || !['like', 'dislike'].includes(type)) {
      return jsonError('Некорректные параметры', 400);
    }

    const updated = updateComment(commentId, c => {
      const likedIdx = c.likedBy.indexOf(user.id);
      const dislikedIdx = c.dislikedBy.indexOf(user.id);

      if (type === 'like') {
        if (likedIdx >= 0) {
          // Toggle off like
          c.likedBy.splice(likedIdx, 1);
          c.likes = Math.max(0, c.likes - 1);
        } else {
          // Add like
          c.likedBy.push(user.id);
          c.likes += 1;
          // Remove dislike if was disliked
          if (dislikedIdx >= 0) {
            c.dislikedBy.splice(dislikedIdx, 1);
            c.dislikes = Math.max(0, c.dislikes - 1);
          }
        }
      } else {
        if (dislikedIdx >= 0) {
          // Toggle off dislike
          c.dislikedBy.splice(dislikedIdx, 1);
          c.dislikes = Math.max(0, c.dislikes - 1);
        } else {
          // Add dislike
          c.dislikedBy.push(user.id);
          c.dislikes += 1;
          // Remove like if was liked
          if (likedIdx >= 0) {
            c.likedBy.splice(likedIdx, 1);
            c.likes = Math.max(0, c.likes - 1);
          }
        }
      }
    });

    if (!updated) {
      return jsonError('Комментарий не найден', 404);
    }

    return jsonOk({
      id: updated.id,
      likes: updated.likes,
      dislikes: updated.dislikes,
      likedBy: updated.likedBy,
      dislikedBy: updated.dislikedBy,
    });
  } catch (err) {
    return jsonError(err);
  }
}
