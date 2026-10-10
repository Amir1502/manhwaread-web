import { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api';
import { createToken, toPublicUser, verifyPassword } from '@/lib/server/auth';
import { findUserByEmailOrUsername, saveUser } from '@/lib/server/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { login, password, backup } = body;

    if (!login || !password) {
      return jsonError('Укажите логин и пароль', 400);
    }

    let user = findUserByEmailOrUsername(login);

    // If Render container was restarted and wiped db.json, recover from verified client backup
    if (!user && backup && backup.username && backup.passwordHash && backup.salt) {
      if (backup.username.trim().toLowerCase() === login.trim().toLowerCase()) {
        const matches = verifyPassword(password, backup.passwordHash, backup.salt);
        if (matches) {
          user = {
            id: backup.id || crypto.randomUUID(),
            username: backup.username,
            email: backup.email || '',
            passwordHash: backup.passwordHash,
            salt: backup.salt,
            avatar: backup.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=JinWoo',
            bio: backup.bio || '',
            exp: backup.exp || 50,
            createdAt: backup.createdAt || Date.now(),
            bookmarks: [],
            history: {},
          };
          saveUser(user);
        }
      }
    }

    if (!user) {
      return jsonError('Неверный логин или пароль', 401);
    }

    const valid = verifyPassword(password, user.passwordHash, user.salt);
    if (!valid) {
      return jsonError('Неверный логин или пароль', 401);
    }

    const token = createToken(user);
    const publicUser = toPublicUser(user);

    const userBackup = {
      id: user.id,
      username: user.username,
      passwordHash: user.passwordHash,
      salt: user.salt,
      avatar: user.avatar,
      bio: user.bio,
      exp: user.exp,
      createdAt: user.createdAt,
    };

    const res = jsonOk({ user: publicUser, token, backup: userBackup });
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
