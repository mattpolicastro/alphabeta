import type { Edge, Node } from '@xyflow/react'

export type StratKind = 'goal' | 'problem' | 'solution' | 'question'
export type BetStatus = 'draft' | 'ready' | 'locked' | 'running' | 'resolved'
export type Outcome = 'win' | 'loss' | 'inconclusive' | 'invalid' | null
export type Gate = 'open' | 'gated' | 'pruned'
export type EdgeKind = 'lineage' | 'elevation' | 'dependency' | 'spawn' | 'evidence' | 'refute'

export interface Amendment {
  ts: string
  field: string
  change: string
  reason: string
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
  lockedAt?: string
  actuals?: string
  call?: string
  amendments?: Amendment[]
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
