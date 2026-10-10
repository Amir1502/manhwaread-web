import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { UserRecord, findUserById, saveUser } from './db';

const SECRET = process.env.AUTH_SECRET || 'manhwaread_secret_key_change_in_production_2026';

export { type PublicUser, calculateLevel, PRESET_AVATARS } from '../auth-types';
import { PublicUser, calculateLevel } from '../auth-types';

export function toPublicUser(user: UserRecord): PublicUser {
  const { level, rankTitle, currentLevelExp, nextLevelExp } = calculateLevel(user.exp);
  return {
    id: user.id,
    username: user.username,
    email: user.email || '',
    avatar: user.avatar,
    bio: user.bio,
    exp: user.exp,
    level,
    rankTitle,
    currentLevelExp,
    nextLevelExp,
    createdAt: user.createdAt,
  };
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

export interface TokenPayload {
  uid: string;
  u?: string;
  h?: string;
  s?: string;
  a?: string;
  b?: string;
  e?: number;
  c?: number;
  exp: number;
}

export function createToken(user: UserRecord | string): string {
  let payloadData: TokenPayload;
  if (typeof user === 'string') {
    payloadData = { uid: user, exp: Date.now() + 30 * 24 * 3600 * 1000 };
  } else {
    payloadData = {
      uid: user.id,
      u: user.username,
      h: user.passwordHash,
      s: user.salt,
      a: user.avatar,
      b: user.bio,
      e: user.exp,
      c: user.createdAt,
      exp: Date.now() + 30 * 24 * 3600 * 1000,
    };
  }
  const payload = Buffer.from(JSON.stringify(payloadData)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
    if (sig !== expectedSig) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as TokenPayload;
    if (!data.uid || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function getUserFromRequest(req: NextRequest): UserRecord | null {
  const authHeader = req.headers.get('authorization');
  let token = req.cookies.get('mr_token')?.value;

  if (!token && authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  if (!token) return null;
  const tokenData = verifyToken(token);
  if (!tokenData) return null;

  let user = findUserById(tokenData.uid);
  // Auto-restore user in memory/db if Render wiped the container
  if (!user && tokenData.u && tokenData.h && tokenData.s) {
    user = {
      id: tokenData.uid,
      username: tokenData.u,
      passwordHash: tokenData.h,
      salt: tokenData.s,
      avatar: tokenData.a || 'https://api.dicebear.com/7.x/bottts/svg?seed=JinWoo',
      bio: tokenData.b || '',
      exp: tokenData.e || 0,
      createdAt: tokenData.c || Date.now(),
      bookmarks: [],
      history: {},
    };
    saveUser(user);
  }

  return user;
}

