'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEngineStatusStore } from '@/lib/store/engineStatusStore';

export function NavBar() {
  const pathname = usePathname();
  const engineStatus = useEngineStatusStore((s) => s.status);

  const links = [
    { href: '/', label: 'Experiments' },
    { href: '/metrics', label: 'Metrics' },
    { href: '/settings', label: 'Settings' },
  ];

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  const statusBadge: Record<string, { className: string; label: string }> = {
    uninitialised: { className: 'bg-secondary', label: 'Engine: idle' },
    loading: { className: 'bg-warning text-dark', label: 'Engine: loading…' },
    ready: { className: 'bg-success', label: 'Engine: ready' },
    error: { className: 'bg-danger', label: 'Engine: error' },
  };

  const badge = statusBadge[engineStatus];

  return (
    <nav className="navbar navbar-expand navbar-dark bg-dark">
      <div className="container" style={{ maxWidth: '80rem' }}>
        <Link href="/" className="navbar-brand fw-bold">
          {process.env.NEXT_PUBLIC_APP_TITLE || '⍺lphaβeta'}
        </Link>
        <ul className="navbar-nav me-auto">
          {links.map((link) => (
            <li key={link.href} className="nav-item">
              <Link
                href={link.href}
                className={`nav-link ${isActive(link.href) ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        {badge && (
          <span className={`badge ${badge.className}`}>{badge.label}</span>
        )}
      </div>
    </nav>
  );
}
