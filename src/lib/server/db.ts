import fs from 'fs';
import path from 'path';

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  avatar: string;
  bio: string;
  exp: number;
  createdAt: number;
  bookmarks: Array<{
    mangaId: string;
    status: string;
    updatedAt: number;
    manga: any;
  }>;
  history: Record<string, any>;
}

export interface CommentRecord {
  id: string;
  mangaId: string;
  chapterId: string;
  pageNumber: number | null;
  userId: string;
  username: string;
  userAvatar: string;
  userLevel: number;
  text: string;
  createdAt: number;
  likes: number;
  dislikes: number;
  likedBy: string[];
  dislikedBy: string[];
  parentId: string | null;
  isSpoiler: boolean;
}

interface DatabaseSchema {
  users: Record<string, UserRecord>;
  comments: CommentRecord[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Memory store
let memoryDb: DatabaseSchema = {
  users: {},
  comments: [],
};

let loaded = false;

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Could not create data directory, using memory DB:', err);
  }
}

export function getDb(): DatabaseSchema {
  if (!loaded) {
    ensureDataDir();
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        memoryDb = JSON.parse(raw);
        if (!memoryDb.users) memoryDb.users = {};
        if (!Array.isArray(memoryDb.comments)) memoryDb.comments = [];
      } else {
        saveDb();
      }
    } catch (err) {
      console.warn('Failed to load db.json, using in-memory state:', err);
    }
    loaded = true;
  }
  return memoryDb;
}

export function saveDb(): void {
  try {
    ensureDataDir();
    fs.writeFileSync(DB_FILE, JSON.stringify(memoryDb, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to persist db.json to disk:', err);
  }
}

// User Helpers
export function findUserByEmailOrUsername(identifier: string): UserRecord | null {
  const db = getDb();
  const lower = identifier.trim().toLowerCase();
  for (const user of Object.values(db.users)) {
    if (user.email.toLowerCase() === lower || user.username.toLowerCase() === lower) {
      return user;
    }
  }
  return null;
}

export function findUserById(id: string): UserRecord | null {
  const db = getDb();
  return db.users[id] || null;
}

export function saveUser(user: UserRecord): void {
  const db = getDb();
  db.users[user.id] = user;
  saveDb();
}

// Comments Helpers
export function getComments(mangaId: string, chapterId: string, pageNumber?: number | null): CommentRecord[] {
  const db = getDb();
  return db.comments.filter(c => {
    if (c.mangaId !== mangaId || c.chapterId !== chapterId) return false;
    if (pageNumber !== undefined) {
      return c.pageNumber === pageNumber;
    }
    return true;
  });
}

export function getCommentCountsByPage(mangaId: string, chapterId: string): Record<number, number> {
  const db = getDb();
  const counts: Record<number, number> = {};
  for (const c of db.comments) {
    if (c.mangaId === mangaId && c.chapterId === chapterId && c.pageNumber !== null && c.pageNumber > 0) {
      counts[c.pageNumber] = (counts[c.pageNumber] || 0) + 1;
    }
  }
  return counts;
}

export function addComment(comment: CommentRecord): void {
  const db = getDb();
  db.comments = db.comments.filter(c => c.id !== comment.id);
  db.comments.unshift(comment);
  saveDb();
}

export function updateComment(id: string, updater: (c: CommentRecord) => void): CommentRecord | null {
  const db = getDb();
  const c = db.comments.find(item => item.id === id);
  if (!c) return null;
  updater(c);
  saveDb();
  return c;
}

export function deleteComment(id: string, userId: string): boolean {
  const db = getDb();
  const idx = db.comments.findIndex(c => c.id === id && c.userId === userId);
  if (idx === -1) return false;
  db.comments.splice(idx, 1);
  saveDb();
  return true;
}
