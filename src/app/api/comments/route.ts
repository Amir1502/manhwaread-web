import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { jsonError, jsonOk } from '@/lib/api';
import { calculateLevel, getUserFromRequest } from '@/lib/server/auth';
import { addComment, deleteComment, getCommentCountsByPage, getComments, saveUser } from '@/lib/server/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const mangaId = searchParams.get('mangaId');
    const chapterId = searchParams.get('chapterId');
    const pageParam = searchParams.get('pageNumber');

    if (!mangaId || !chapterId) {
      return jsonError('mangaId and chapterId are required', 400);
    }

    const pageNumber = pageParam !== null && pageParam !== '' ? (pageParam === 'all' ? undefined : Number(pageParam)) : undefined;

    const comments = getComments(mangaId, chapterId, pageNumber);
    const pageCounts = getCommentCountsByPage(mangaId, chapterId);

    return jsonOk({
      comments,
      totalCount: comments.length,
      pageCounts,
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return jsonError('Войдите в аккаунт, чтобы оставить комментарий', 401);
    }

    const body = await req.json();
    const { mangaId, chapterId, pageNumber, text, parentId, isSpoiler } = body;

    if (!mangaId || !chapterId || !text || typeof text !== 'string' || !text.trim()) {
      return jsonError('Текст комментария не может быть пустым', 400);
    }

    const cleanText = text.trim();
    if (cleanText.length > 2000) {
      return jsonError('Комментарий слишком длинный (максимум 2000 символов)', 400);
    }

    const { level } = calculateLevel(user.exp);

    const comment = {
      id: crypto.randomUUID(),
      mangaId,
      chapterId,
      pageNumber: typeof pageNumber === 'number' && pageNumber > 0 ? pageNumber : null,
      userId: user.id,
      username: user.username,
      userAvatar: user.avatar,
      userLevel: level,
      text: cleanText,
      createdAt: Date.now(),
      likes: 0,
      dislikes: 0,
      likedBy: [],
      dislikedBy: [],
      parentId: parentId || null,
      isSpoiler: Boolean(isSpoiler),
    };

    addComment(comment);

    // Award EXP for writing comment (+10 EXP)
    user.exp = (user.exp || 0) + 10;
    saveUser(user);

    return jsonOk({ comment }, 0);
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return jsonError('Требуется авторизация', 401);
    }

    const { searchParams } = req.nextUrl;
    const commentId = searchParams.get('id');
    if (!commentId) {
      return jsonError('Comment ID required', 400);
    }

    const deleted = deleteComment(commentId, user.id);
    if (!deleted) {
      return jsonError('Комментарий не найден или нет прав на удаление', 403);
    }

    return jsonOk({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
