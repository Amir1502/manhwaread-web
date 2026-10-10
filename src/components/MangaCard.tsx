import Link from 'next/link';
import { SManga } from '@/lib/types';
import { SOURCE_LABELS, STATUS_LABELS } from '@/lib/labels';
import CoverImage from './CoverImage';
import { IconStar } from './Icons';

const LIST_BADGES: Record<string, { label: string; cls: string }> = {
  favorites: { label: 'Любимые', cls: 'badge-list-fav' },
  reading: { label: 'Читаю', cls: 'badge-list-reading' },
  completed: { label: 'Прочитано', cls: 'badge-list-completed' },
  planned: { label: 'В планах', cls: 'badge-list-planned' },
  dropped: { label: 'Брошено', cls: 'badge-list-dropped' },
};

export default function MangaCard({
  manga,
  eager = false,
  userListStatus,
}: {
  manga: SManga;
  eager?: boolean;
  userListStatus?: string;
}) {
  const meta = manga.type || (manga.status !== 'UNKNOWN' ? STATUS_LABELS[manga.status] : 'Манхва');
  const listBadge = userListStatus ? LIST_BADGES[userListStatus] : null;

  return (
    <Link href={`/manga/${manga.id}`} className="manga-card" prefetch={false}>
      <div className="cover">
        <CoverImage src={manga.coverUrl} alt={manga.title} eager={eager} />
        {manga.rating > 0 && (
          <span className="badge badge-tl badge-rating-mangalib">
            {manga.rating.toFixed(1)}
          </span>
        )}
        {listBadge ? (
          <span className={`badge badge-tr ${listBadge.cls}`}>{listBadge.label}</span>
        ) : manga.isAdult ? (
          <span className="badge badge-tr badge-adult">18+</span>
        ) : null}
        <span className="badge badge-br">{SOURCE_LABELS[manga.sourceId] || manga.sourceId}</span>
      </div>
      <h3 className="manga-card-title" title={manga.title}>
        {manga.title}
      </h3>
      <div className="manga-card-meta">{meta}</div>
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
