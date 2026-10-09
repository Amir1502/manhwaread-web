'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link href="/" className="logo-badge">
          <div className="logo-icon">MR</div>
          <div className="logo-text">
            Manhwa<span>Read</span>
          </div>
          <span className="chip chip-ai" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
            AI Reader
          </span>
        </Link>

        <nav className="nav-links">
          <Link 
            href="/" 
            className={`nav-link ${pathname === '/' ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="7" height="7" x="3" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="14" rx="1" />
              <rect width="7" height="7" x="3" y="14" rx="1" />
            </svg>
            Каталог
          </Link>

          <Link 
            href="/library" 
            className={`nav-link ${pathname === '/library' ? 'active' : ''}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
            </svg>
            Библиотека
          </Link>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span 
            className="chip chip-accent" 
            style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Готово к привязке к my.to на Vercel"
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
            my.to ready
          </span>

          <a 
            href="https://github.com/Amir1502/manhwaread" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
}
