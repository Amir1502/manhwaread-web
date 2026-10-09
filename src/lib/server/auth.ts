import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { UserRecord, findUserById } from './db';

const SECRET = process.env.AUTH_SECRET || 'manhwaread_secret_key_change_in_production_2026';

export { type PublicUser, calculateLevel, PRESET_AVATARS } from '../auth-types';
import { PublicUser, calculateLevel } from '../auth-types';

export function toPublicUser(user: UserRecord): PublicUser {
  const { level, rankTitle, currentLevelExp, nextLevelExp } = calculateLevel(user.exp);
  return {
    id: user.id,
    username: user.username,
    email: user.email,
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

export function createToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + 30 * 24 * 3600 * 1000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): string | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
    if (sig !== expectedSig) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.uid || data.exp < Date.now()) return null;
    return data.uid as string;
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
  const userId = verifyToken(token);
  if (!userId) return null;
  return findUserById(userId);
}

