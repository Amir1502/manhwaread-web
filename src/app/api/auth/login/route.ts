import { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api';
import { createToken, toPublicUser, verifyPassword } from '@/lib/server/auth';
import { findUserByEmailOrUsername } from '@/lib/server/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { login, password } = body;

    if (!login || !password) {
      return jsonError('Укажите логин/email и пароль', 400);
    }

    const user = findUserByEmailOrUsername(login);
    if (!user) {
      return jsonError('Неверный логин или пароль', 401);
    }

    const valid = verifyPassword(password, user.passwordHash, user.salt);
    if (!valid) {
      return jsonError('Неверный логин или пароль', 401);
    }

    const token = createToken(user.id);
    const publicUser = toPublicUser(user);

    const res = jsonOk({ user: publicUser, token });
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
