export type ReadingStatus = 'reading' | 'planned' | 'completed' | 'dropped';

export interface SManga {
  id: string;
  sourceId: string;
  title: string;
  altTitle?: string;
  description: string;
  coverUrl: string;
  authors: string[];
  status: 'ONGOING' | 'COMPLETED' | 'HIATUS' | 'UNKNOWN';
  rating: number;
  genres: string[];
  totalChapters?: number;
  lastUpdated?: string;
  views?: number;
}

export interface SChapter {
  id: string;
  mangaId: string;
  sourceId: string;
  number: number;
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
  // Original text (e.g. KR / EN)
  originalText?: string;
  // Translated text (RU)
  translatedText: string;
  // Styling for crisp vector rendering
  fontSize?: number; // percentage or pt relative to bubble
  fontWeight?: 'normal' | 'bold' | 'bolder';
  fontFamily?: string;
  textColor?: string;
  backgroundColor?: string; // bubble mask background (e.g. #FFFFFF or transparent)
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

export interface ReadingProgress {
  mangaId: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle?: string;
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
}
