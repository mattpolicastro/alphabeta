# Brand v0 — decisions & open items (2026-08-23)

## Decided
- **Wordmark:** αlphaβeta — Commissioner 900, letter-spacing −0.02em, Greek native
  (no glyph workarounds). ® superscript in accent color.
- **Design language:** "The Instrument" — engineering-drawing register. Graphite
  ink on chalk grounds, hairline rules, dimension-line ornament, DIN-flavored
  condensed labels (Barlow Semi Condensed), Barlow body, IBM Plex Mono for data.
- **State-as-style (system principle):** draft = pencil register (dashed, faded);
  locked = ink register (solid, dated, sealed). Commitment legible before reading.
- **Accent discipline:** one accent color, spent ONLY on commitment marks
  (fold-if, lock seal, hero underline). Never decoration.
- **Tagline:** "The tools aren't missing. The discipline is." (hero);
  "say what would change your mind — before you look" (sign-off).
- **Avoid:** warm-paper AI-tool defaults, Memphis, gradient-SaaS.

## Decided (cont.)
- **Accent: #4059d8 "ballpoint ultramarine"** — ink-blue; commitment = writing it
  down. 6.0:1 on chalk — passes text contrast on its own, so one token serves
  both marks and text (no accent-text split needed).

## Decided (cont. 2)
- **Headings: Barlow Semi Condensed** (deliberate contrast with the Commissioner
  wordmark; Archivo rejected as uncanny near-twin, too loose next to the tight mark).
- Final font stack: Commissioner 900 (wordmark only) · Barlow Semi Condensed
  500/700 (headings, labels, buttons) · Barlow 400/600 (body) · IBM Plex Mono
  400/600 (data, fold-ifs, ledger).

## Open

## Canvas layout rules (settled 2026-08-25)
- **Vertical is the default orientation (changed 2026-09-04; was horizontal).** Horizontal remains a toggle. In horizontal, kinds are columns (goal → problem →
  question/solution → bets by generation), siblings stack vertically; the cascade
  reads left→right as strategy → evidence → bets. Vertical remains a toggle.
- Questions and solutions share a lane (dotted vs solid) so problem→child edges
  never traverse another lane.
- Tree layout is subtree-contiguous (no interleaving → no crossings within a tree);
  multi-parent nodes attach under their first lineage/elevation parent.
- Cards never overlap; overlaps resolve along the packing axis only. Altitude/
  column is sacred. Auto-layout runs on demand and on node arrival — never on drag.
- Cards are always opaque; state lives in color, never alpha.

## Weight and color, settled 2026-09-04 (supersedes the hairline defaults)

Two complaints drove this: the canvas felt *weightless* and *disorganized*.

- **Structure and weight are separate decisions.** Structure = altitude lanes
  washed over the retained graph paper (a `--band-wash`, so the grid reads
  through). Weight = raised, borderless cards. Radius stays 0.
- **No stroke ever uses `--ink`.** `--ink` is the text token; drawing borders
  with it produces a hard white outline on the dark ground. Strokes use
  `--edge` (hairline) / `--edge-strong` (drawn line).
- **Dark ground drops, dark card rises** (`#191b1f` / `#272b31`) so elevation
  has something to separate from — surface contrast carries the weight that a
  border would.
- **Type scale:** 10 eyebrow · 13 body · 15 title · 18 goal. Card titles are
  Barlow Semi Condensed **500** at line-height 1.3; at 700 the title competed
  with the ink header band and the mono fold-if.
- **`--terra` means commitment and nothing else** — fold-if, lock seal,
  elevation edge. It is never an outcome color.
- **A loss is graphite, not red.** Killing an idea is a win here; a red card
  punishes the behaviour the tool rewards. The alarm belongs on the
  **deviation** line (`--incon`) — shipping anyway after the fold-if said stop.
  Status color otherwise lives on the pill and a 3px card rule: win `--win`,
  inconclusive `--incon`, loss `--loss` (graphite).
- **Chrome is quieter than content.** The legend and minimap are raised paper,
  not the black block, and sit clear of the bets row.
- **Solution cards offer `place a bet` and `ask a question` at equal weight**,
  neither accented. That pair is the discipline choice — spend a test or
  answer it with a lookup — so making one louder biases the thing the tool
  exists to check. ("Elevate to bet" is retired.)
- **Baseline, not center, in any row mixing the wordmark with nav.** The
  wordmark's box carries the β descender and uppercase tabs have none, so
  centering boxes rides the wordmark visibly high.
