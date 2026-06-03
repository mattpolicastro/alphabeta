# Handoff: alphaBeta Platform

## Overview

alphaBeta is a **serverless, browser-based decision-logging and discipline tool** for
empirical work. It is not a stats tool — it's a **discipline layer** that sits alongside
existing experimentation platforms and makes implicit process tradeoffs visible. Core
differentiator: existing tools answer "can I run this?"; alphaBeta asks "should I?" and
holds you to what you committed.

The design files in this bundle are **wireframe-fidelity HTML prototypes** — journey-mapping
artifacts, not production code. They show intended structure, flow, and interaction patterns
in a deliberately low-fi register (dashed borders, monospace type, blueprint grid). The task
is to **recreate these designs in a production environment** using the design system tokens
and component patterns documented in `Design System.html`.

## Fidelity

**Low-fidelity wireframes** with working interactions. The aesthetic is intentional (polish
misleads at this stage), but the **design system reference** (`Design System.html`) defines
canonical tokens, components, and layout rules that should carry into production. Typography,
colors, spacing, and component anatomy are specified; pixel-level polish is not.

---

## Architecture: Five Layers

The platform has five layers, two transitions, and a cross-cutting integrity spine. See
`substrate/Layer Model.md` for the full specification.

```
1. STRATEGY        — governance, what's in scope (formerly Plinth Board)
   ↓ discernment   — which work items are bets?
2. PLANNING        — define, vet, sequence bets within a period
3. REFINEMENT      — pre-registration: articulate → commit (all pre-data)
4. IN-FLIGHT → RESOLUTION — monitoring + verdict (method-specific)
5. KM              — learning, calibration, loop back to #1 (method-agnostic)

┃ INTEGRITY — timestamps, fingerprints, deviation logs (cross-cutting)
```

**Key structural split:** layers 1–3 are pre-data; layer 4 is method-specific; layer 5 is
method-agnostic. By layer 5, the method doesn't matter.

### Adoption Tiers (bottom-up ladder)

| Tier | Layers | Scope |
|---|---|---|
| 1. Individual discipline | 3 → 4 | one person, one bet — the minimum viable loop |
| 2. Learning practitioner | 3 → 4 → 5 | + decision journal over time |
| 3. Team planning | 2 → 3 → 4 → 5 | + sequencing, portfolio |
| 4. Org strategy | 1 → 2 → 3 → 4 → 5 | + governance, full 5→1 loop |

**Recommended build order:** Tier 1 first (layers 3 → 4). This is the minimum viable
product: one person pre-registers a bet, locks it, and revisits against the commitment.

---

## Screens / Views

### Layer 3: Refinement (the single-bet lifecycle)

**All screens share:** global gnav (dark strip, 38px), lifecycle rail (clickable, shows
progress), two-column layout (1.4fr main + 1fr annotation sidebar), max-width 1140px.

#### 3.1 Bet Front Door (`Bet Front Door.html`)
- **Purpose:** Articulate a loose idea into a falsifiable bet.
- **Flow:** dump (free text) → reflect (the tool pushes back, scans for a falsifier,
  separates mechanism from confidence) → sharpen into the wager sentence.
- **Key components:** textarea (dump), reflection cards (heard/push/gap/filled states),
  wager sentence with editable tokens, falsifiability state indicator, express lane toggle.
- **State:** the wager persists to localStorage as `ab_bet`.
- **Interactions:** real-time text analysis (regex-based confidence/mechanism/falsifier
  scan), gap-fill prompt for missing falsifier, confidence-cycle click on the wager token.
- **Tweaks panel:** pushback tone (gentle/balanced/insistent), falsifier (insist/optional),
  mechanism flag, express lane visibility, accent color.

#### 3.2 Feasibility & Instrument (`Feasibility and Instrument.html`)
- **Purpose:** the fold-if becomes the detection spec; pick the instrument.
- **Flow:** reads committed bet from localStorage; shows the fold-if as read-only
  (step back to edit); live fit engine scores instruments against constraints.
- **Key components:** locked fold-if display, constraint sliders (randomization, traffic,
  urgency, claim strength), instrument cards with fit/costly/ruled badges, nudge panel,
  override-with-reason field.
- **State:** reads `ab_bet`, writes instrument choice.
- **Interactions:** live MDE→runtime computation, instrument re-ranking on constraint change.

#### 3.3 Decision Criteria (`Decision Criteria.html`)
- **Purpose:** pre-register win / inconclusive / loss actions.
- **Key components:** criteria rows (win/incon/loss with editable action fields),
  fold-if = loss line + minimum mind-changer, method-supplied evidence bar.
- **State:** reads bet + instrument, writes criteria to `ab_criteria`.

#### 3.4 Commit & Lock (`Commit and Lock.html`)
- **Purpose:** two-step commit — draft (editable) or lock (timestamped, immutable).
- **Key components:** assembled pre-registration card (all carried fields), draft/lock
  toggle, SHA-256 fingerprint generation, timestamp, the "running teaser" linking forward.
- **State:** writes `ab_committed` with `{locked: true, lockedAt, fingerprint, BET, CRIT, INSTR}`.
- **Critical:** lock must be **genuinely immutable** — once locked, fields cannot be edited.
  Edits create a new version.

### Layer 4: In-flight → Resolution

Two method-specific versions built:

#### 4.1a A/B Test In-flight (`In-flight AB.html`)
- **4a phase:** runtime bar, SRM check, assignment integrity, peek-exposure counter,
  guardrail metrics (ok/warn/fail), peek-discipline prompt.
- **4b phase:** observed lift (big number), confidence interval, p-value, locked MDE/fold-if
  comparison, integrity summary, computed bucket (win/incon/loss), pre-registered action
  recall, CTA → Revisit.

#### 4.1b Moderated Interviews In-flight (`In-flight Interviews.html`)
- **4a phase:** recruitment tracker (vs committed sample), session log, guide-adherence
  discipline (drift flagging, emergent vs confirmatory marking).
- **4b phase:** theme mapping against pre-registered hypothesis (supports/contradicts/neutral
  tags), emergent findings separated, visual evidence bar, qualitative bucket, CTA → Revisit.

#### 4.2 Revisit (`Revisit.html`)
- **Purpose:** commitment meets outcome — the judgment call.
- **Key components:** locked commitment card (read-only), actuals slider (interactive),
  guardrail toggle, verdict bucket (computed from fold-if), pre-registered action recall,
  call buttons (keep/hold/revert), honored/deviation judgment, deviation reason field,
  calibration readout, learning textarea, "start next bet" loop.
- **State:** reads `ab_committed`, computes bucket.
- **Critical interaction:** if the user's call deviates from the pre-registered action,
  the deviation reason field opens — logged, not blocked.

### Layer 2: Planning (substrate altitude)

#### 2.1 Bet Sequencing (`substrate/Bet Sequencing.html`)
- **Purpose:** decide single bet vs sequence; if sequence, set dependency shape.
- **Key components:** single/sequence toggle, dependency shape selector
  (chain/fan-in/parallel), editable sub-bet rows, live graph preview.

#### 2.2 Journal Index (`substrate/Journal Index.html`)
- **Purpose:** the ledger of all bets across objectives.
- **Key components:** three view lenses (Ledger by objective / Board by status / Log
  chronological), filter chips (all/draft/locked/running/resolved), derived status badges.
- **Principle:** status is **read-only** — derived from lifecycle position, never set here.

#### 2.3 Dependent Bets (`substrate/Dependent Bets.html`)
- **Purpose:** linear conditional progression.
- **Interaction:** resolve bets in order; win unlocks next, loss prunes downstream.
  Override ("run anyway") is flagged and logged.

#### 2.4 Fan-in Bets (`substrate/Fan-in Bets.html`)
- **Purpose:** multi-prerequisite bets with AND/OR join.
- **Interaction:** AND (default) = all must win; OR = any suffices. The orphaned-win case.
- **Settled:** see `substrate/Join Behavior.md`.

#### 2.5 Cross-Goal Scoping (`substrate/Cross-Goal Scoping.html`)
- **Purpose:** dependencies can cross objectives.
- **Pattern:** soft filter + muted cross-references. Dependencies never hidden, just dimmed.

### Layer 1: Strategy

#### 1.1 Full Flow (`substrate/Full Flow.html`)
- **Purpose:** end-to-end storyboard (5 screens) for demonstration.
- **Screen 1:** full NSF board (strategy view) with click-to-inspect on work items and
  "send to decision substrate" action.
- **Contains the seam interaction:** discernment happens in the strategy view, not a
  separate screen.

---

## Interactions & Behavior

### Carry pattern
Data carries forward through localStorage:
- `ab_bet` — the articulated bet (from Front Door)
- `ab_criteria` — pre-registered criteria (from Decision Criteria)
- `ab_committed` — the locked, immutable record (from Commit & Lock)

Each screen reads the prior screen's output and displays it as read-only context.

### Immutability
Once a bet is locked (Commit & Lock), all committed fields must be genuinely immutable:
- The locked record includes a SHA-256 content fingerprint.
- Edits after lock create a **new version**, never overwrite.
- The fingerprint is verifiable: hash the committed fields and compare.
- This is the spine of evidentiary integrity.

### Deviation logging
When the user's actual call at Revisit deviates from the pre-registered action:
- The deviation is highlighted (terracotta).
- A reason field opens — the user explains in their own words.
- The reason is recorded alongside the original commitment.
- **Nudge, not gate** — the user is never blocked from deviating.

### Conditional progression
When a bet in a sequence resolves:
- **Win** → the next bet in the chain unlocks.
- **Loss** → all downstream bets are pruned (not run).
- **Override** → a pruned bet can be forced ("run anyway"), but it's flagged as running on
  an unproven premise, and logged.
- For fan-in: AND = all prereqs must win; OR = any suffices.

---

## Suggested Data Model

```
Objective {
  id: string
  title: string
  metric: string
  target: { start: number, goal: number }
  framework: 'NSF' | 'RICE' | 'GPS' | 'OKR' | 'GIST'
  tag: string                    // e.g. "Marketing", "Product"
  bets: BetRef[]                 // ordered
}

Bet {
  id: string
  objectiveId: string
  type: 'single' | 'sequence'

  // Layer 3: Refinement
  articulation: {
    change: string               // what you're changing
    direction: 'lift' | 'reduce' // expected direction
    metric: string               // what you're measuring
    magnitude: string            // expected size ("8%")
    mechanism: string | null     // the "because" — why it would work
    confidence: 'hunch-level' | 'fairly' | 'highly'
    foldIf: string               // the falsifier
  }

  instrument: {
    type: 'ab' | 'quasi' | 'observational' | 'holdback' | 'interviews'
    overrideReason: string | null  // if user overrode the recommended instrument
    feasibility: { ... }           // method-specific (MDE, runtime, etc.)
  }

  criteria: {
    win: string                  // pre-registered action
    inconclusive: string
    loss: string
    minMindChanger: string       // = the fold-if
    evidenceBar: string          // method-supplied
  }

  // Commit
  status: 'draft' | 'locked' | 'running' | 'resolved'
  lockedAt: ISO8601 | null
  fingerprint: string | null     // SHA-256 of the committed fields

  // Layer 4: Resolution
  resolution: {
    outcome: 'win' | 'inconclusive' | 'loss' | null
    actuals: { ... }             // method-specific (observed lift, themes, etc.)
    integrityFlags: IntegrityFlag[]
    call: 'keep' | 'hold' | 'revert' | null
    deviation: {
      occurred: boolean
      reason: string | null
    }
    resolvedAt: ISO8601 | null
  }

  // Layer 5: Learning
  learning: {
    calibration: string | null   // expected vs actual
    reflection: string | null    // "what I'd bet differently"
  }
}

Sequence {
  id: string
  objectiveId: string
  shape: 'chain' | 'fanin' | 'parallel'
  nodes: SequenceNode[]
}

SequenceNode {
  betId: string
  prerequisites: string[]        // betIds this node depends on
  joinType: 'and' | 'or'        // only relevant if prerequisites.length > 1
  override: {
    forced: boolean
    reason: string | null
  }
}

IntegrityFlag {
  type: 'srm' | 'peek' | 'guardrail' | 'guide_drift' | 'recruitment_drift'
  status: 'ok' | 'warn' | 'fail'
  detail: string
}
```

### Storage

- **IndexedDB** — primary storage. One object store per entity (objectives, bets, sequences).
- **No backend.** Serverless by design — individual-first adoption, privacy by default.
- **Immutability enforcement:** locked bets are stored with their fingerprint. Any read
  operation can verify integrity by re-hashing. The application layer refuses edits to locked
  records; only new versions are permitted.
- **localStorage** is used for cross-page carry during the lifecycle flow (draft state);
  IndexedDB is the permanent store.

---

## Design Tokens

See `Design System.html` for the full canonical reference. Summary:

### Colors
| Token | Value | Usage |
|---|---|---|
| paper | #f5f1e8 | background |
| paper-hover | #efe9da | hover state |
| ink | #2a2a2a | primary text |
| ink-soft | 55% ink | secondary text |
| ink-faint | 32% ink | tertiary / disabled |
| terra | #a64d3b | accent, discipline, active states |
| green | #3a6b4a | positive / done / win |
| amber | #b8860b | caution / inconclusive |
| plinth | #5a6b8c | strategy-layer origin |

### Typography
| Role | Size | Weight | Notes |
|---|---|---|---|
| Page title | 26px | 700 | letter-spacing: -0.5px |
| Section title | 18px | 700 | |
| Panel title | 14px | 700 | |
| Body | 13px | 400 | |
| Detail | 11.5px | 400 | ink-soft |
| Label | 10.5px | 400 | uppercase, 1px tracking |
| Micro-label | 9px | 700 | uppercase, 1.5px tracking |
| Margin note | 17px | — | Caveat, terracotta, rotated |

### Layout
- Max-width: **1140px**
- Two-column: **1.4fr 1fr**, gap **22px**
- Panel padding: **18px**
- Field padding: **10px 12px**
- All borders: **1.5px dashed**, no rounded corners
- Blueprint grid: 28px × 28px, always visible

---

## Files in This Bundle

### Canonical lifecycle (Layer 3 + 4)
| File | Layer | Purpose |
|---|---|---|
| `Bet Front Door.html` | 3 | Articulate the bet |
| `Feasibility and Instrument.html` | 3 | Feasibility + instrument selection |
| `Decision Criteria.html` | 3 | Pre-register actions |
| `Commit and Lock.html` | 3 | Draft / lock |
| `In-flight AB.html` | 4 | A/B test monitoring + results |
| `In-flight Interviews.html` | 4 | Interview monitoring + synthesis |
| `Revisit.html` | 4 | Commitment vs outcome judgment |

### Substrate altitude (Layer 1–2)
| File | Layer | Purpose |
|---|---|---|
| `substrate/Full Flow.html` | 1–4 | End-to-end storyboard |
| `substrate/Bet Sequencing.html` | 2 | Single vs sequence decomposition |
| `substrate/Journal Index.html` | 2 | Ledger / Board / Log |
| `substrate/Dependent Bets.html` | 2 | Linear chain progression |
| `substrate/Fan-in Bets.html` | 2 | Multi-prerequisite AND/OR |
| `substrate/Cross-Goal Scoping.html` | 2 | Soft filter + muted xrefs |
| `substrate/Plinth Seam.html` | 1–2 | Strategy ⇄ substrate concept |

### Reference
| File | Purpose |
|---|---|
| `Design System.html` | Canonical tokens, components, layout |
| `alphaBeta - Index.html` | Project index (5-layer architecture) |
| `substrate/Layer Model.md` | Full layer model specification |
| `substrate/Join Behavior.md` | Settled join decision |
| `CLAUDE.md` | Nomenclature, architecture, conventions |
| `explorations/ITERATION-LOG.md` | Full iteration trail |

### Settled Decisions
| Decision | Document |
|---|---|
| Join behavior (AND/OR) | `substrate/Join Behavior.md` |
| Layer model (5 layers) | `substrate/Layer Model.md` |
| Nomenclature | `CLAUDE.md` |
| Narrator vs product UI | `CLAUDE.md` (aesthetic section) |
| Calibration deferred | `substrate/Layer Model.md` (layer 5) |

---

## Build Recommendations

### Sprint 1: Minimum viable loop (Tier 1 — Layers 3 → 4)
1. Bet Front Door (dump → reflect → wager)
2. Commit & Lock (draft / lock with fingerprint)
3. Revisit (bucket computation + deviation logging)
4. Skip feasibility and criteria for MVP — let users lock directly from the wager

### Sprint 2: Full lifecycle
5. Feasibility & Instrument
6. Decision Criteria
7. In-flight views (start with A/B)

### Sprint 3: Planning (Tier 3 — Layer 2)
8. Journal Index (the ledger)
9. Bet Sequencing
10. Dependent Bets / conditional progression

### Sprint 4: Strategy integration (Tier 4 — Layer 1)
11. Strategy board integration (the seam)
12. Cross-goal scoping
13. Fan-in / complex dependencies
