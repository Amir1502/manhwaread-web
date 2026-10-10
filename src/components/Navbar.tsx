'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconBookmark, IconBook, IconGithub, IconGrid } from './Icons';
import UserMenu from './auth/UserMenu';

export default function Navbar() {
  const pathname = usePathname();
  if (pathname.startsWith('/read/') || pathname.includes('/read')) return null;

  const links = [
    { href: '/', label: 'Каталог', icon: <IconGrid />, active: pathname === '/' || pathname.startsWith('/manga/') },
    { href: '/books', label: 'Книги', icon: <IconBook />, active: pathname.startsWith('/books') },
    { href: '/library', label: 'Библиотека', icon: <IconBookmark />, active: pathname.startsWith('/library') },
  ];

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link href="/" className="logo" aria-label="Tsundoku — на главную">
          <div className="logo-icon">TD</div>
          <div>
            Tsun<span>doku</span>
          </div>
        </Link>

        <nav className="nav-links">
          {links.map(l => (
            <Link key={l.href} href={l.href} className={`nav-link ${l.active ? 'active' : ''}`}>
              {l.icon}
              <span className="nav-link-label">{l.label}</span>
            </Link>
          ))}
        </nav>

        <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <a
            href="https://github.com/Amir1502/manhwaread-web"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm nav-github"
          >
            <IconGithub />
            GitHub
          </a>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
