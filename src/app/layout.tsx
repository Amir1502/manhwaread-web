import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'ManhwaRead — Читалка манги и манхвы с AI-векторным переводом',
  description: 'Современная веб-читалка манхвы и манги с чистым интерфейсом, поддержкой MangaDex и революционным AI-оверлеем перевода бабблов на русский язык без мыла и запекания в растр.',
  keywords: ['читалка манги', 'манхва онлайн', 'manhwaread', 'mangadex', 'читать манхву', 'ai перевод манги'],
  authors: [{ name: 'ManhwaRead Team' }],
  openGraph: {
    title: 'ManhwaRead — Читалка манги и манхвы',
    description: 'Веб-читалка нового поколения с мгновенным AI-векторным переводом прямо в бабблы.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#090A0F" />
      </head>
      <body>
        <Navbar />
        <main>{children}</main>

        <footer style={{
          marginTop: '5rem',
          borderTop: '1px solid var(--border-subtle)',
          padding: '2.5rem 0 3.5rem',
          background: 'var(--bg-surface)',
          color: 'var(--text-secondary)',
          fontSize: '0.88rem'
        }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                ManhwaRead Web
              </div>
              <div>Портировано из Android-проекта <a href="https://github.com/Amir1502/manhwaread" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>Amir1502/manhwaread</a></div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <span className="chip chip-ai">Векторный AI-перевод OverlaySpec</span>
              <span className="chip chip-accent">Vercel & my.to Ready</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
