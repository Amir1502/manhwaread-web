import Link from 'next/link';
import { SManga } from '@/lib/types';
import { SOURCE_LABELS, STATUS_LABELS } from '@/lib/labels';
import CoverImage from './CoverImage';
import { IconStar } from './Icons';

export default function MangaCard({ manga, eager = false }: { manga: SManga; eager?: boolean }) {
  const meta = [manga.type, manga.status !== 'UNKNOWN' ? STATUS_LABELS[manga.status] : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <Link href={`/manga/${manga.id}`} className="manga-card" prefetch={false}>
      <div className="cover">
        <CoverImage src={manga.coverUrl} alt={manga.title} eager={eager} />
        {manga.type && <span className="badge badge-tl">{manga.type}</span>}
        {manga.isAdult && <span className="badge badge-tr badge-adult">18+</span>}
        {manga.rating > 0 && (
          <span className="badge badge-bl badge-rating">
            <IconStar size={11} />
            {manga.rating.toFixed(1)}
          </span>
        )}
        <span className="badge badge-br">{SOURCE_LABELS[manga.sourceId] || manga.sourceId}</span>
      </div>
      <h3 className="manga-card-title" title={manga.title}>
        {manga.title}
      </h3>
      {meta && <div className="manga-card-meta">{meta}</div>}
    </Link>
  );
}

export function MangaCardSkeleton() {
  return (
    <div className="manga-card" aria-hidden>
      <div className="cover skeleton" />
      <div className="skeleton" style={{ height: 14, width: '85%' }} />
      <div className="skeleton" style={{ height: 11, width: '50%' }} />
    </div>
  );
}
