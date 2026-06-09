# Handoff: alphaBeta — Design Reference Package

## Overview

alphaBeta is a **serverless, browser-based discipline layer for empirical work** — a decision-support platform that surfaces "should I run this?" alongside "can I?" and holds practitioners to what they committed. This package contains all design references for the platform's five-layer architecture.

## About the Design Files

The files in this bundle are **HTML design prototypes** — wireframes showing intended layout, interaction patterns, and information architecture. They are **not production code**. The task is to recreate these designs in the target codebase (currently a SvelteKit app with IndexedDB / Pyodide) using its established patterns. The HTML prototypes use a low-fidelity wireframe aesthetic that is **intentional and should be preserved** in production — dashed borders, blueprint grid, monospace type. This is the product's visual identity, not placeholder styling.

## Fidelity

**Low-to-medium fidelity wireframes** with a deliberate aesthetic. The visual language (colors, type, spacing, borders) is final — use the exact tokens. Layout structures and interaction patterns are the reference. Copy/content is placeholder but structurally representative.

## Start Here

- **`alphaBeta - Index.html`** — the project hub; shows the full layer architecture and links to every surface
- **`substrate/Full Flow.html`** — the 5-screen end-to-end storyboard (best entry point for understanding the flow)
- **`Design System.html`** — canonical tokens, components, and specimens
- **`Page Templates.html`** — the 5 recurring layout skeletons with slot specs
- **`CLAUDE.md`** — nomenclature, architecture decisions, aesthetic conventions

---

## Platform Architecture: Five Layers

```
1. STRATEGY         (pre-data)    governance, goals, "the work"
   ↓ discernment — which work items are bets?
2. PLANNING         (pre-data)    define, vet, sequence bets
   ↓
3. REFINEMENT       (pre-data)    articulate → commit & lock
   ↓
4. IN-FLIGHT → RESOLUTION  (method-specific)  monitoring + verdict
   ↓
5. KNOWLEDGE MANAGEMENT    (method-agnostic)  learning → loop to #1

   ║ INTEGRITY / CHAIN OF CUSTODY — cross-cutting ║
```

See `substrate/Layer Model.md` for the full specification.

---

## Screens by Layer

### Layer 1: Strategy
| Screen | File | Purpose |
|---|---|---|
| Strategy Board (NSF) | `substrate/Full Flow.html` (screen 1) | Full NSF board; click work items to identify bets |

### Layer 2: Planning
| Screen | File | Purpose |
|---|---|---|
| Bet Sequencing | `substrate/Bet Sequencing.html` | Single bet vs sequence; chain/fan-in/parallel shape |
| Journal Index | `substrate/Journal Index.html` | Ledger/Board/Log lenses; derived status |
| Plan View | `substrate/Plan View Interactive.html` | Timeline with grouped sequences, drag interactions |
| Dependent Bets | `substrate/Dependent Bets.html` | Linear chain; win unlocks, loss prunes |
| Fan-in Bets | `substrate/Fan-in Bets.html` | Multi-prereq AND/OR join; orphaned-win |
| Cross-Goal Scoping | `substrate/Cross-Goal Scoping.html` | Soft filter + muted cross-references |

### Layer 3: Refinement (the single-bet lifecycle)
| Screen | File | Purpose |
|---|---|---|
| Bet Front Door | `Bet Front Door.html` | Dump → reflect → sharpen into wager |
| Feasibility & Instrument | `Feasibility and Instrument.html` | Fold-if = detection spec; instrument fit engine |
| Decision Criteria | `Decision Criteria.html` | Pre-register win/incon/loss actions |
| Commit & Lock | `Commit and Lock.html` | Three-state: draft → ready → locked (at launch) |

### Layer 4: In-flight → Resolution
| Screen | File | Purpose |
|---|---|---|
| In-flight A/B | `In-flight AB.html` | SRM checks, peek log, guardrails, runtime |
| In-flight Interviews | `In-flight Interviews.html` | Session log, theme tracker, saturation |
| Revisit | `Revisit.html` | Commitment vs outcome; bucket from fold-if; deviation log |

### Front Door (cross-cutting entry point)
| Screen | File | Purpose |
|---|---|---|
| Decomposition Chat | `substrate/Decomposition Chat.html` | Conversational LLM front door; parse → classify → route |
| Decomposition Visualizer | `substrate/Decomposition Visualizer.html` | Static version; animated step-by-step extraction |
| Open Front Door | `substrate/Open Front Door.html` | Altitude routing (single/sequence/strategy/vague) |

### Reference / Demo
| Screen | File | Purpose |
|---|---|---|
| Full Flow | `substrate/Full Flow.html` | 5-screen end-to-end storyboard |
| Journey Map T1 | `substrate/Journey Map T1.html` | Tier 1 journey map (individual practitioner) |
| Plinth Seam | `substrate/Plinth Seam.html` | Concept: strategy ⇄ substrate connection |

---

## Design System

### `Design System.html` — Component Reference
All tokens, type scale, spacing, and component specimens in one page.

### `Page Templates.html` — Layout Skeletons
Five templates with slot specs and a decision tree:

| Template | Layout | Use when |
|---|---|---|
| **A · Form + Sidebar** | 1.4fr + 1fr (sticky sidebar) | User is editing a single bet with discipline alongside |
| **B · Read + Act** | 1fr + 1fr | Comparing locked commitment to outcome |
| **C · Full-Width Data** | Single column | Scanning/managing many items (ledger, timeline) |
| **D · Input + Output** | 1fr + 1fr | Providing raw input to be structured |
| **E · Storyboard** | Step rail + swappable screen | Multi-screen walkthrough for demos |

### Design Tokens (quick reference)
```
Colors:
  --paper:       #f5f1e8    (warm off-white)
  --paper-hover: #efe9da
  --ink:         #2a2a2a    (near-black)
  --ink-soft:    rgba(42,42,42,.55)
  --ink-faint:   rgba(42,42,42,.32)
  --terra:       #a64d3b    (terracotta — primary accent, discipline voice)
  --green:       #3a6b4a    (positive, done, win)
  --amber:       #b8860b    (caution, contention)
  --plinth:      #5a6b8c    (strategy-layer origin)

Type:
  Font: JetBrains Mono (monospace — the brand voice)
  Handwriting: Caveat (margin notes only)
  Scale: 26/18/14/13/11.5/10.5/9px

Spacing: 4/8/14/18/24/28px
Borders: 1.5px dashed (default) · solid only on active/selected/locked states
Max-width: 1140px
```

### Key Visual Rules
- **No rounded corners.** No drop shadows (except narrator band).
- **Blueprint grid** (28px, 3.5% ink) always visible.
- **Status badges are read-only** — derived from lifecycle, never set manually.
- **Narrator bands (dark ink)** = meta-commentary about the design. **Annotation sidebars (terracotta)** = in-product discipline prompts.
- **Global nav** (dark ink strip, 38px) on every page, sticky top:0.

---

## Bet Lifecycle States
```
draft → ready → locked → running → resolved
```
- **draft** — being structured; fully editable
- **ready** — structured; still editable but signals completeness (peer review happens here)
- **locked** — immutable; fires at experiment launch; timestamped + fingerprinted
- **running** — experiment live; method-specific monitoring
- **resolved** — revisit complete; verdict + call + learning captured

---

## Key Interactions to Implement

1. **Bet Front Door dump→reflect→sharpen** — textarea input, regex+LLM parsing, reflection cards with gap detection, editable wager sentence with confidence cycling
2. **Feasibility live slider** — MDE slider drives runtime/opp-cost readout; instrument fit engine with nudge-not-gate override
3. **Commit three-state flow** — draft → ready (green, reviewable) → locked (terra, timestamped, fingerprinted, immutable)
4. **Revisit verdict engine** — actuals slider; bucket computed from locked fold-if; pre-registered action recalled; honored/deviation judgment with logged reason
5. **Plan View drag interactions** — bar slide (horizontal reschedule with dependency snap-back); group reorder (vertical, sequences move as unit); live contention detection
6. **Decomposition Chat** — conversational multi-turn; inline extraction cards; branching reply chips; altitude routing
7. **Journal Index** — three lenses (Ledger/Board/Log) over one dataset; real filters; derived status badges; click-through to bet's lifecycle stage

---

## Architecture Documents (included)

| Document | Path | Contents |
|---|---|---|
| Layer Model | `substrate/Layer Model.md` | Full 5-layer spec with coverage gaps |
| Architecture Reconciliation | `substrate/Architecture Reconciliation.md` | Alignment with rewrite doc; lock timing, MCP, inconclusive loop |
| Join Behavior | `substrate/Join Behavior.md` | AND/OR join decision (settled) |
| Plan View Handoff | `substrate/Plan View Handoff.md` | Detailed plan-view spec |
| CLAUDE.md | `CLAUDE.md` | Nomenclature, positioning, aesthetic conventions |

---

## What's Deferred (do not build yet)

- Calibration / win-rate track-record (creates perverse incentives — later opt-in)
- Weighted / per-edge join semantics
- Knowledge graph / aggregate learning / the 5→1 loop mechanism
- Framework-specific decomposition (RICE vs NSF vs GPS)
- Agent-assisted "what next?" loop after inconclusive results

---

## Implementation Notes

- **Serverless / IndexedDB** — no accounts, no backend, all storage local
- **Pyodide/WASM primary** for stats compute (Lambda fallback)
- **Individual-first adoption** — tiers 1–2 need no accounts
- **The bet data model is the contract**, not the UI flow — MCP tools as an alternative surface for power users
- **Regex as floor, LLM as enhancement** — the front door should degrade gracefully without LLM access
