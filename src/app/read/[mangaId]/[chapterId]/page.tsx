'use client';

import { use } from 'react';
import Reader from '@/components/reader/Reader';

export default function ReaderPage({ params }: { params: Promise<{ mangaId: string; chapterId: string }> }) {
  const { mangaId, chapterId } = use(params);
  const m = decodeURIComponent(mangaId);
  const c = decodeURIComponent(chapterId);
  // Keyed by chapter: all reader state (page, HUD, bubbles) resets on chapter change.
  return <Reader key={`${m}/${c}`} mangaId={m} chapterId={c} />;
}
