export type ReadingStatus = 'reading' | 'planned' | 'completed' | 'dropped';

export type MangaStatus = 'ONGOING' | 'COMPLETED' | 'HIATUS' | 'CANCELLED' | 'UNKNOWN';

export type SortMode = 'popular' | 'latest';

export interface SManga {
  /** Global id: `${sourceId}~${slug}` (legacy: `md-<uuid>` or demo slugs). */
  id: string;
  sourceId: string;
  title: string;
  altTitle?: string;
  description: string;
  coverUrl: string;
  authors: string[];
  status: MangaStatus;
  /** 0..10, 0 = unknown */
  rating: number;
  genres: string[];
  type?: string;
  ageRating?: string;
  isAdult?: boolean;
  totalChapters?: number;
  lastUpdated?: string;
  views?: number;
  sourceUrl?: string;
}

export interface SChapter {
  /** Source-local chapter id, URL-safe. */
  id: string;
  mangaId: string;
  sourceId: string;
  number: number;
  volume?: number;
  title: string;
  releaseDate?: string;
  scanlationGroup?: string;
  pagesCount?: number;
}

export interface SpeechBubble {
  id: string;
  // Normalized bounding coordinates (0..1 relative to page width/height)
  x: number;
  y: number;
  width: number;
  height: number;
  originalText?: string;
  translatedText: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | 'bolder';
  fontFamily?: string;
  textColor?: string;
  backgroundColor?: string;
  padding?: number;
}

export interface OverlaySpec {
  pageIndex: number;
  bubbles: SpeechBubble[];
}

export interface Page {
  index: number;
  imageUrl: string;
  fallbackUrl?: string;
  width?: number;
  height?: number;
  overlay?: OverlaySpec;
}

export interface MangaListResult {
  items: SManga[];
  hasNextPage: boolean;
}

export interface ReadingProgress {
  mangaId: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle?: string;
  mangaTitle?: string;
  coverUrl?: string;
  pageIndex: number;
  totalPages: number;
  updatedAt: number;
}

export interface LibraryItem {
  manga: SManga;
  status: ReadingStatus;
  progress?: ReadingProgress;
  addedAt: number;
  updatedAt: number;
}

export interface SourceMeta {
  id: string;
  name: string;
  lang: string;
  baseUrl: string;
  isOnline: boolean;
  supportsSearch: boolean;
  isAdult?: boolean;
  note?: string;
}
