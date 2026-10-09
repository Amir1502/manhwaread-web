'use client';

import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith('/read/')) return null;
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>ManhwaRead Web</div>
          <div>
            Веб-версия Android-проекта{' '}
            <a href="https://github.com/Amir1502/manhwaread" target="_blank" rel="noopener noreferrer">
              Amir1502/manhwaread
            </a>
            . Контент принадлежит правообладателям и сайтам-источникам.
          </div>
        </div>
        <div>Источники: MangaLib · ReManga · MangaMir · MangaDex · Manga18fx (18+)</div>
      </div>
    </footer>
  );
}
