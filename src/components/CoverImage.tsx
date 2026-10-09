'use client';

import { useState } from 'react';

/** Cover with graceful fallback (no stock photos pretending to be covers). */
export default function CoverImage({ src, alt, eager = false }: { src?: string; alt: string; eager?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = !src || failedSrc === src;
  if (failed) return <div className="cover-placeholder">{alt}</div>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote covers go through our proxy, next/image adds no value here
    <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedSrc(src)} />
  );
}
