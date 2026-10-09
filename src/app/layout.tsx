import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const manrope = Manrope({ subsets: ['latin', 'cyrillic'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'ManhwaRead — читалка манги и манхвы', template: '%s · ManhwaRead' },
  description:
    'Веб-читалка манхвы и манги: MangaLib, ReManga, MangaMir, MangaDex в одном каталоге, библиотека, история и векторный AI-оверлей перевода.',
  keywords: ['читалка манги', 'манхва онлайн', 'manhwaread', 'mangalib', 'remanga', 'mangamir', 'mangadex'],
  openGraph: {
    title: 'ManhwaRead — читалка манги и манхвы',
    description: 'Все источники в одном каталоге, библиотека, история и векторный AI-оверлей.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0c0d12',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={manrope.variable}>
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
