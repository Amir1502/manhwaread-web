'use client';

import { useState } from 'react';
import { Page } from '@/lib/types';

/** Page image with fallback server + manual retry instead of a broken icon. */
export default function PageImage({
  page,
  eager,
  className = 'page-image',
  onClick,
}: {
  page: Page;
  eager?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const sources = [page.imageUrl, page.fallbackUrl].filter((s): s is string => Boolean(s));
  const [attempt, setAttempt] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const [loaded, setLoaded] = useState(false);

  if (attempt >= sources.length) {
    return (
      <div className="page-error" onClick={e => e.stopPropagation()}>
        Не удалось загрузить страницу {page.index}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setAttempt(0);
            setRetryKey(k => k + 1);
          }}
        >
          Повторить
        </button>
      </div>
    );
  }

  const ratio = page.width && page.height ? `${page.width} / ${page.height}` : undefined;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- pages are huge remote images served via proxy/CDN
    <img
      key={`${attempt}-${retryKey}`}
      src={sources[attempt]}
      alt={`Страница ${page.index}`}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onClick={onClick}
      onLoad={() => setLoaded(true)}
      onError={() => setAttempt(a => a + 1)}
      style={
        !loaded && ratio
          ? { aspectRatio: ratio, background: '#111' }
          : !loaded
            ? { minHeight: '60vh', background: '#111' }
            : undefined
      }
    />
  );
}
