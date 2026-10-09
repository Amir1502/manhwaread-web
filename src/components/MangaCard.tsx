'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SManga } from '@/lib/types';

interface MangaCardProps {
  manga: SManga;
}

export default function MangaCard({ manga }: MangaCardProps) {
  const [imgSrc, setImgSrc] = useState(manga.coverUrl);

  const handleImageError = () => {
    // Fallback image if remote cover fails
    setImgSrc('https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80');
  };

  return (
    <Link href={`/manga/${manga.id}`} className="manga-card">
      <div className="manga-cover-wrapper">
        <img
          src={imgSrc}
          alt={manga.title}
          className="manga-cover-img"
          loading="lazy"
          onError={handleImageError}
        />
        <div className="manga-badge-top">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
          {manga.rating.toFixed(1)}
        </div>

        <div className="manga-badge-source">
          {manga.sourceId === 'curated' ? 'AI OCR' : 'MangaDex'}
        </div>
      </div>

      <div className="manga-card-info">
        <h3 className="manga-card-title" title={manga.title}>
          {manga.title}
        </h3>

        <div className="manga-card-meta">
          <span>{manga.genres[0] || 'Манхва'}</span>
          <span>{manga.status === 'COMPLETED' ? 'Завершён' : 'Онгоинг'}</span>
        </div>
      </div>
    </Link>
  );
}
