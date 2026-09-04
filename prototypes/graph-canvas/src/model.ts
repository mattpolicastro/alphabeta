import type { Edge, Node } from '@xyflow/react'

export type StratKind = 'goal' | 'problem' | 'solution' | 'question'
export type BetStatus = 'draft' | 'ready' | 'locked' | 'running' | 'resolved'
export type Outcome = 'win' | 'loss' | 'inconclusive' | 'invalid' | null
export type Gate = 'open' | 'gated' | 'pruned'
export type EdgeKind = 'lineage' | 'elevation' | 'dependency' | 'spawn' | 'evidence' | 'refute'

// v0.3 instrument ladder — see shape/event-grammar-v0.3-addendum.md
export type InstrumentType = 'ab' | 'quasi' | 'holdback' | 'study' | 'prepost' | 'none'
// A bet minted from a lab tool carries the tool's inputs (the URL contract, src/funnel.ts)
// instead of a typed spec line; `note` is what the lock moment adds on top.
export interface LabSpec {
  from: string
  v: number
  params: Record<string, number | string>
  sealed?: string
  note?: string
}
export interface Instrument {
  type: InstrumentType
  spec?: string | LabSpec
}

// Compiled at lock from the criteria prose (src/criteria.ts). The prose is canonical;
// this is a machine-readable shadow of it, nulls where the prose gave no number.
export interface DecisionRule {
  bucket: 'win' | 'inconclusive' | 'loss'
  prose: string
  metric: string
  direction: 'increase' | 'decrease'
  threshold: number | null
  unit: string | null
  comparator: 'gte' | 'lte' | 'gt' | 'lt' | null
}

export type GroundTier = 'local-observed' | 'adjacent' | 'cross-org-pattern' | 'anecdotal'
export interface Ground {
  text: string
  tier: GroundTier
}

export interface Amendment {
  ts: string
  field: string
  change: string
  reason: string
}

// Evidence attached from a lab tool (src/attach.ts) — append-only, like amendments.
// It arrives after the lock by definition, so it is never a committed field and
// never inside the seal. `hash` is the app's own SHA-256 of `canonical`; `seal` is
// what the lab sent, kept so the cockpit can say whether the two agree.
export type EvidenceTool = 'srm' | 'results' | 'bayes' | 'sequential' | 'pre-post'
export type EvidenceVerdict = 'ok' | 'mismatch' | 'win' | 'loss' | 'inconclusive' | 'continue' | 'stop'
export interface EvidenceRecord {
  id: string
  ts: string
  tool: EvidenceTool
  v: number
  params: Record<string, number | string>
  canonical: string
  hash: string
  seal?: string
  summary: string
  verdict?: EvidenceVerdict
}

export interface BetRecord {
  change: string
  direction: 'lift' | 'reduce'
  metric: string
  magnitude: string
  mechanism: string
  foldIf: string
  confidence?: string
  guardrails?: string
  instrument?: Instrument
  origin?: string // where the draft came from (e.g. sized in the lab) — pencil, not committed
  expectation?: string // no-counterfactual rungs (prepost, none): what you think will happen
  evidenceBar?: string // study rung: what evidence would move you
  premortem?: string
  decisionRules?: DecisionRule[]
  lockedAt?: string
  expectedResolveBy?: string // maturation, if declared at lock — the docket reads it (src/contentions.ts)
  resolvedAt?: string
  seal?: string // SHA-256 of the committed fields at lock (src/lock.ts)
  actuals?: string
  call?: string
  amendments?: Amendment[]
  evidence?: EvidenceRecord[] // from the lab, after the lock — outside the seal (src/attach.ts)
  surface: string
  status: BetStatus
  outcome: Outcome
  criteria: { win: string; inconclusive: string; loss: string }
  deviation?: string | null
  learning?: string | null
}

export interface StratRecord {
  kind: StratKind
  title: string
  detail?: string
  answered?: boolean
  takeaway?: string
  expectation?: string
  owner?: string
  validity?: string
  createdAt?: string // first seen — the docket ages an owned open question from here (src/docket-items.ts)
  // solution admission paperwork
  grounds?: Ground[]
  screens?: string[]
  arbitration?: string
}

export function wagerSentence(b: BetRecord): string {
  const verb = b.direction === 'lift' ? 'lift' : 'reduce'
  return `Betting that ${b.change} will ${verb} ${b.metric} by ${b.magnitude}.`
}

// ── Gate derivation ────────────────────────────────────────────────
// A bet with incoming dependency edges:
//   any source resolved-loss (or itself pruned)  → pruned
//   all sources resolved-win                     → open
//   otherwise                                    → gated
// Pruning propagates downstream through dependency edges.
export function deriveGates(nodes: Node[], edges: Edge[]): Map<string, Gate> {
  const gates = new Map<string, Gate>()
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const deps = edges.filter((e) => (e.data as any)?.kind === 'dependency')

  const incoming = new Map<string, string[]>()
  for (const e of deps) {
    if (!incoming.has(e.target)) incoming.set(e.target, [])
    incoming.get(e.target)!.push(e.source)
  }

  for (const n of nodes) gates.set(n.id, 'open')

  // fixpoint — graph is tiny
  for (let pass = 0; pass < 12; pass++) {
    let changed = false
    for (const [target, sources] of incoming) {
      const prior = gates.get(target)
      let next: Gate = 'open'
      let allWin = true
      for (const src of sources) {
        const d = byId.get(src)?.data as any
        const bet = d?.bet as BetRecord | undefined
        const q = d?.strat?.kind === 'question' ? (d.strat as StratRecord) : undefined
        const srcPruned = gates.get(src) === 'pruned'
        const srcLoss = bet?.status === 'resolved' && bet.outcome === 'loss'
        // a question gates until answered; a refuting answer (validity 'invalid' or takeaway
        // marked as refuting) is policy, not derivable here — answered = open
        const srcOpen = bet ? bet.status === 'resolved' && bet.outcome === 'win' : q ? !!q.answered : true
        if (srcLoss || srcPruned) {
          next = 'pruned'
          break
        }
        if (!srcOpen) allWin = false
      }
      if (next !== 'pruned') next = allWin ? 'open' : 'gated'
      if (next !== prior) {
        gates.set(target, next)
        changed = true
      }
    }
    if (!changed) break
  }
  return gates
}
