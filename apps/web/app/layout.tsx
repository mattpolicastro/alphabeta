import type { Metadata } from 'next';
import 'bootstrap/dist/css/bootstrap.min.css';
import { NavBar } from '@/components/NavBar';
import { GlobalLoadingIndicator } from '@/components/GlobalLoadingIndicator';
import { ThemeProvider } from '@/components/ThemeProvider';

const appTitle = process.env.NEXT_PUBLIC_APP_TITLE || '⍺lphaβeta';

export const metadata: Metadata = {
  title: appTitle,
  description: appTitle + ' | A/B test and experiment analysis tool',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <GlobalLoadingIndicator />
          <NavBar />
          <div
            className="alert alert-warning text-center mb-0 rounded-0 py-2"
            role="alert"
            style={{ fontSize: '0.875rem' }}
          >
            This app is in active alpha development. Backup often as breaking changes may
            be released frequently.
          </div>
          <main className="container" style={{ maxWidth: '80rem' }}>
            {children}
          </main>
          <footer className="text-center text-muted py-3 small">
            <a
              href={`https://github.com/mattpolicastro/alphabeta/releases/tag/${process.env.NEXT_PUBLIC_APP_VERSION}`}
              className="text-muted text-decoration-none"
              target="_blank"
              rel="noopener noreferrer"
            >
              {process.env.NEXT_PUBLIC_APP_VERSION || 'dev'}
            </a>
            {' · '}
            <a
              href="https://github.com/mattpolicastro/alphabeta"
              className="text-muted text-decoration-none"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
