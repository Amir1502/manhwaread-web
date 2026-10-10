import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { jsonError, jsonOk } from '@/lib/api';
import { createToken, hashPassword, toPublicUser, PRESET_AVATARS } from '@/lib/server/auth';
import { findUserByEmailOrUsername, saveUser, UserRecord } from '@/lib/server/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return jsonError('Имя пользователя должно быть не менее 3 символов', 400);
    }
    if (!password || typeof password !== 'string' || password.length < 4) {
      return jsonError('Пароль должен содержать не менее 4 символов', 400);
    }

    const cleanUsername = username.trim();

    const existing = findUserByEmailOrUsername(cleanUsername);
    if (existing) {
      return jsonError('Пользователь с таким логином уже существует', 409);
    }

    const { hash, salt } = hashPassword(password);
    const userId = crypto.randomUUID();
    const avatar = PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)];

    const newUser: UserRecord = {
      id: userId,
      username: cleanUsername,
      email: '',
      passwordHash: hash,
      salt,
      avatar,
      bio: 'Читатель манхвы',
      exp: 50, // Welcome bonus: starting at level 2!
      createdAt: Date.now(),
      bookmarks: [],
      history: {},
    };

    saveUser(newUser);

    const token = createToken(newUser);
    const publicUser = toPublicUser(newUser);

    const backup = {
      id: newUser.id,
      username: newUser.username,
      passwordHash: newUser.passwordHash,
      salt: newUser.salt,
      avatar: newUser.avatar,
      bio: newUser.bio,
      exp: newUser.exp,
      createdAt: newUser.createdAt,
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
