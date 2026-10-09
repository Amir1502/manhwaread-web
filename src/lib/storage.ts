import { LibraryItem, ReadingProgress, ReadingStatus, SManga } from './types';

const STORAGE_KEYS = {
  LIBRARY: 'manhwaread_library_v1',
  PROGRESS: 'manhwaread_progress_v1',
  SETTINGS: 'manhwaread_settings_v1',
};

export interface ReaderSettings {
  mode: 'webtoon' | 'paginated';
  aiOverlayEnabled: boolean;
  maxWidth: number; // e.g. 800, 1000, 1400 (or 0 for 100%)
  pageGap: number;
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  mode: 'webtoon',
  aiOverlayEnabled: true,
  maxWidth: 900,
  pageGap: 0,
};

// --- Library Management ---

export function getLibraryItems(): LibraryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LIBRARY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLibraryItem(manga: SManga, status: ReadingStatus): LibraryItem[] {
  if (typeof window === 'undefined') return [];
  const items = getLibraryItems();
  const existingIdx = items.findIndex(i => i.manga.id === manga.id);
  const now = Date.now();

  if (existingIdx >= 0) {
    items[existingIdx].status = status;
    items[existingIdx].updatedAt = now;
  } else {
    items.unshift({
      manga,
      status,
      addedAt: now,
      updatedAt: now,
    });
  }

  try {
    localStorage.setItem(STORAGE_KEYS.LIBRARY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save library item', err);
  }
  return items;
}

export function removeLibraryItem(mangaId: string): LibraryItem[] {
  if (typeof window === 'undefined') return [];
  const items = getLibraryItems().filter(i => i.manga.id !== mangaId);
  try {
    localStorage.setItem(STORAGE_KEYS.LIBRARY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to remove library item', err);
  }
  return items;
}

export function getMangaLibraryStatus(mangaId: string): ReadingStatus | null {
  const items = getLibraryItems();
  const found = items.find(i => i.manga.id === mangaId);
  return found ? found.status : null;
}

// --- Reading Progress & History ---

export function getAllProgress(): Record<string, ReadingProgress> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getMangaProgress(mangaId: string): ReadingProgress | null {
  const all = getAllProgress();
  return all[mangaId] || null;
}

export function saveProgress(progress: ReadingProgress): void {
  if (typeof window === 'undefined') return;
  const all = getAllProgress();
  all[progress.mangaId] = progress;
  try {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to save progress', err);
  }
}

// --- Reader Settings ---

export function getReaderSettings(): ReaderSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveReaderSettings(settings: Partial<ReaderSettings>): ReaderSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const current = getReaderSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save reader settings', err);
  }
  return updated;
}
