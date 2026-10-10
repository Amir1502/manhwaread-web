import { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api';
import { createToken, getUserFromRequest, toPublicUser } from '@/lib/server/auth';
import { findUserByEmailOrUsername, saveUser } from '@/lib/server/db';

export async function PATCH(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return jsonError('Требуется авторизация', 401);
    }

    const body = await req.json();
    const { username, avatar, bio } = body;

    if (username && typeof username === 'string' && username.trim() !== user.username) {
      const clean = username.trim();
      if (clean.length < 3) return jsonError('Имя пользователя должно быть не менее 3 символов', 400);
      const exists = findUserByEmailOrUsername(clean);
      if (exists && exists.id !== user.id) {
        return jsonError('Это имя пользователя уже занято', 409);
      }
      user.username = clean;
    }

    if (avatar && typeof avatar === 'string') {
      user.avatar = avatar.trim();
    }

    if (typeof bio === 'string') {
      user.bio = bio.slice(0, 300).trim();
    }

    saveUser(user);
    const token = createToken(user);
    const publicUser = toPublicUser(user);
    const backup = {
      id: user.id,
      username: user.username,
      passwordHash: user.passwordHash,
      salt: user.salt,
      avatar: user.avatar,
      bio: user.bio,
      exp: user.exp,
      createdAt: user.createdAt,
    };

    const res = jsonOk({ user: publicUser, token, backup });
    res.cookies.set('mr_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 3600,
      path: '/',
    });
    return res;
  } catch (err) {
    return jsonError(err);
  }
}
