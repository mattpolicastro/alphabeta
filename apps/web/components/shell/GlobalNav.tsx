// Sticky dark-ink nav rendered on every page. Mirrors the design's `.gnav`
// pattern (38px ink strip, terra-accented logo, paper-colored links). Sits
// above the per-page paper-register header so navigation and identity are
// always one click away regardless of where you are in the lifecycle.
//
// 'use client' is here so usePathname() can mark the active route. The
// logic is tiny — defer to the hook + CSS rather than threading active
// state down through props.

"use client";

import { usePathname } from "next/navigation";

type NavLink = { href: string; label: string };

// Top-level destinations. Bet stages don't appear here — they belong to
// the per-page spine rail, not the global nav.
const LINKS: NavLink[] = [
  { href: "/bet/new", label: "new bet" },
  { href: "/design-system", label: "design system" },
];

export function GlobalNav() {
  const pathname = usePathname() ?? "";

  const isCurrent = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className="gnav" aria-label="Global navigation">
      <a
        className="gnav-logo"
        href="/"
        aria-current={pathname === "/" ? "page" : undefined}
      >
        alph<span className="a">⍺</span>
        <span className="b">β</span>eta
      </a>
      <span className="gnav-sep" aria-hidden />
      {LINKS.map((link) => (
        <a
          key={link.href}
          href={link.href}
          aria-current={isCurrent(link.href) ? "page" : undefined}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
