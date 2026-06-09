// Sticky dark-ink nav rendered on every page. Mirrors the design's `.gnav`
// pattern (38px ink strip, terra-accented logo, paper-colored links). Sits
// above the per-page paper-register header.
//
// Top-level items map to the design's 5-layer architecture (Strategy /
// Planning / Refinement / Running / KM). Layers with multiple surfaces use
// a dropdown; layers we haven't built yet render disabled with a short
// "what this is" note in the dropdown body.

"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { DebugPanel } from "@/components/shell/DebugPanel";

type NavItem =
  | { kind: "link"; href: string; label: string; layer?: string }
  | { kind: "disabled"; label: string; note: string; layer?: string }
  | { kind: "dropdown"; label: string; layer?: string; children: NavChild[] };

type NavChild =
  | { kind: "link"; href: string; label: string; note?: string }
  | { kind: "disabled"; label: string; note: string };

const ITEMS: NavItem[] = [
  {
    kind: "link",
    href: "/strategy",
    label: "orient",
    layer: "Layer 1 — Strategy",
  },
  {
    kind: "link",
    href: "/",
    label: "plan",
    layer: "Layer 2 — Planning",
  },
  {
    kind: "link",
    href: "/bet/wager",
    label: "draft",
    layer: "Layer 3 — Refinement",
  },
  {
    kind: "dropdown",
    label: "run",
    layer: "Layer 4 — In-flight",
    children: [
      { kind: "link", href: "/bet/run", label: "in-flight", note: "needs a locked bet" },
    ],
  },
  {
    kind: "link",
    href: "/learn",
    label: "learn",
    layer: "Layer 5 — KM",
  },
];

const FOOTER_LINKS: NavItem[] = [
  { kind: "link", href: "/design-system", label: "design system" },
];

export function GlobalNav() {
  const pathname = usePathname() ?? "";
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  // Click-outside / Escape closes the open dropdown.
  useEffect(() => {
    if (!openMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [openMenu]);

  const isCurrent = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav ref={navRef} className="gnav" aria-label="Global navigation">
      <a
        className="gnav-logo"
        href="/bet/new"
        aria-current={pathname === "/bet/new" ? "page" : undefined}
      >
        alph<span className="a">⍺</span>
        <span className="b">β</span>eta
      </a>
      <span className="gnav-sep" aria-hidden />
      {ITEMS.map((item) => (
        <NavItemRenderer
          key={item.label}
          item={item}
          isCurrent={isCurrent}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
        />
      ))}
      <span className="gnav-spacer" />
      {FOOTER_LINKS.map((item) => (
        <NavItemRenderer
          key={item.label}
          item={item}
          isCurrent={isCurrent}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
        />
      ))}
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(230, 223, 206, 0.6)',
          cursor: 'pointer',
          fontSize: '14px',
          padding: '0 8px',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          fontFamily: 'inherit',
        }}
        aria-label="Settings"
        title="Settings & debug"
      >
        ⚙
      </button>
      <DebugPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </nav>
  );
}

type NavItemRendererProps = {
  item: NavItem;
  isCurrent: (href: string) => boolean;
  openMenu: string | null;
  setOpenMenu: (label: string | null) => void;
};

function NavItemRenderer({
  item,
  isCurrent,
  openMenu,
  setOpenMenu,
}: NavItemRendererProps) {
  if (item.kind === "link") {
    return (
      <a
        href={item.href}
        aria-current={isCurrent(item.href) ? "page" : undefined}
      >
        {item.label}
      </a>
    );
  }
  if (item.kind === "disabled") {
    return (
      <span
        className="gnav-disabled"
        aria-disabled="true"
        title={`${item.layer ?? ""}${item.layer ? " — " : ""}${item.note}`}
      >
        {item.label}
      </span>
    );
  }

  const open = openMenu === item.label;
  return (
    <div className="gnav-dropdown">
      <button
        type="button"
        className="gnav-dropdown-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpenMenu(open ? null : item.label)}
      >
        {item.label}
        <span className="gnav-dropdown-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="gnav-dropdown-panel" role="menu">
          {item.children.map((child) =>
            child.kind === "link" ? (
              <a
                key={child.label}
                href={child.href}
                role="menuitem"
                aria-current={isCurrent(child.href) ? "page" : undefined}
                onClick={() => setOpenMenu(null)}
              >
                {child.label}
                {child.note && (
                  <span className="gnav-disabled-note">{child.note}</span>
                )}
              </a>
            ) : (
              <span
                key={child.label}
                className="gnav-disabled"
                role="menuitem"
                aria-disabled="true"
              >
                {child.label}
                <span className="gnav-disabled-note">{child.note}</span>
              </span>
            ),
          )}
        </div>
      )}
    </div>
  );
}
