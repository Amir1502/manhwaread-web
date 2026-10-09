import { LibraryItem, ReadingProgress, ReadingStatus, SManga } from './types';

export const STORAGE_KEYS = {
  LIBRARY: 'manhwaread_library_v1',
  PROGRESS: 'manhwaread_progress_v1',
  SETTINGS: 'manhwaread_settings_v1',
  READ: 'manhwaread_read_chapters_v1',
} as const;

export const STORAGE_EVENT = 'manhwaread:storage';

export interface ReaderSettings {
  mode: 'webtoon' | 'paginated';
  aiOverlayEnabled: boolean;
  maxWidth: number; // 0 = 100%
  pageGap: number;
  showAdult: boolean;
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  mode: 'webtoon',
  aiOverlayEnabled: true,
  maxWidth: 900,
  pageGap: 0,
  showAdult: false,
};

const isBrowser = () => typeof window !== 'undefined';

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: key }));
  } catch (err) {
    console.error('Failed to write localStorage', key, err);
  }
}

/** Strip heavy fields before persisting a manga snapshot. */
function snapshot(m: SManga): SManga {
  return { ...m, description: m.description.slice(0, 400), genres: m.genres.slice(0, 8) };
}

// --- Library ---

export function getLibraryItems(): LibraryItem[] {
  const items = read<LibraryItem[]>(STORAGE_KEYS.LIBRARY, []);
  return Array.isArray(items) ? items.filter(i => i && i.manga && i.manga.id) : [];
}

export function saveLibraryItem(manga: SManga, status: ReadingStatus): LibraryItem[] {
  const items = getLibraryItems();
  const now = Date.now();
  const idx = items.findIndex(i => i.manga.id === manga.id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], manga: snapshot(manga), status, updatedAt: now };
  } else {
    items.unshift({ manga: snapshot(manga), status, addedAt: now, updatedAt: now });
  }
  write(STORAGE_KEYS.LIBRARY, items);
  return items;
}

export function removeLibraryItem(mangaId: string): LibraryItem[] {
  const items = getLibraryItems().filter(i => i.manga.id !== mangaId);
  write(STORAGE_KEYS.LIBRARY, items);
  return items;
}

export function getMangaLibraryStatus(mangaId: string): ReadingStatus | null {
  return getLibraryItems().find(i => i.manga.id === mangaId)?.status ?? null;
}

// --- Progress & history ---

export function getAllProgress(): Record<string, ReadingProgress> {
  const all = read<Record<string, ReadingProgress>>(STORAGE_KEYS.PROGRESS, {});
  return all && typeof all === 'object' ? all : {};
}

export function getMangaProgress(mangaId: string): ReadingProgress | null {
  return getAllProgress()[mangaId] || null;
}

export function saveProgress(progress: ReadingProgress): void {
  const all = getAllProgress();
  all[progress.mangaId] = progress;
  // keep history bounded
  const entries = Object.values(all)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 300);
  write(STORAGE_KEYS.PROGRESS, Object.fromEntries(entries.map(e => [e.mangaId, e])));
}

export function removeProgress(mangaId: string): void {
  const all = getAllProgress();
  delete all[mangaId];
  write(STORAGE_KEYS.PROGRESS, all);
}

// --- Read chapters ---

export function getReadChapters(mangaId: string): string[] {
  return read<Record<string, string[]>>(STORAGE_KEYS.READ, {})[mangaId] || [];
}

export function markChapterRead(mangaId: string, chapterId: string): void {
  const all = read<Record<string, string[]>>(STORAGE_KEYS.READ, {});
  const list = all[mangaId] || [];
  if (list.includes(chapterId)) return;
  all[mangaId] = [...list, chapterId].slice(-3000);
  write(STORAGE_KEYS.READ, all);
}

// --- Settings ---

export function getReaderSettings(): ReaderSettings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<ReaderSettings>>(STORAGE_KEYS.SETTINGS, {}) };
}

export function saveReaderSettings(settings: Partial<ReaderSettings>): ReaderSettings {
  const updated = { ...getReaderSettings(), ...settings };
  write(STORAGE_KEYS.SETTINGS, updated);
  return updated;
}
