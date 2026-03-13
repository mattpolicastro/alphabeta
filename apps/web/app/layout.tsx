import type { Metadata } from 'next';
import 'bootstrap/dist/css/bootstrap.min.css';
import { NavBar } from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'A/B Test Analysis Tool',
  description: 'Statically-generated A/B test and experiment analysis tool',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <main className="container" style={{ maxWidth: '80rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
