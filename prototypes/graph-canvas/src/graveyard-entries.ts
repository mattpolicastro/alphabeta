// The Graveyard: what died, and what it cost. Read-only; nothing here is a verdict
// on the people who placed the bets. Problems die by detonation (a refute edge),
// questions are mooted by an invalid answer or a dead parent, bets die as a loss
// or are pruned before they run.
import type { Edge, Node } from '@xyflow/react'
import { deriveGates, type BetRecord, type StratRecord } from './model'
import { DAY, maturationOf } from './contentions'

export interface GraveEntry {
  id: string
  tag: string
  kind: 'problem' | 'question' | 'bet'
  title: string
  fate: string
  cost: string
}

const strat = (n: Node) => (n.data as any)?.strat as StratRecord | undefined
const bet = (n: Node) => (n.data as any)?.bet as BetRecord | undefined
const tagOf = (n: Node) => {
  const s = (n.data as any)?.seq ?? '·'
  return n.type === 'bet' ? `B${s}` : `${(strat(n)?.kind ?? '?')[0].toUpperCase()}${s}`
}
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

export function graveyardOf(nodes: Node[], edges: Edge[], now = Date.now()): GraveEntry[] {
  const out: GraveEntry[] = []
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const kind = (e: Edge) => (e.data as any)?.kind as string | undefined
  const refuted = new Set(edges.filter((e) => kind(e) === 'refute').map((e) => e.target))
  const childrenOf = (id: string) => edges.filter((e) => e.source === id && kind(e) === 'lineage').map((e) => byId.get(e.target)).filter(Boolean) as Node[]
  const parentsOf = (id: string) => edges.filter((e) => e.target === id && kind(e) === 'lineage').map((e) => byId.get(e.source)).filter(Boolean) as Node[]

  for (const n of nodes) {
    const s = strat(n)
    if (s?.kind === 'problem' && refuted.has(n.id)) {
      const gated = childrenOf(n.id).filter((c) => strat(c)?.kind === 'solution').length
      out.push({ id: n.id, tag: tagOf(n), kind: 'problem', title: s.title, fate: 'detonated — refuted by evidence', cost: `gated ${plural(gated, 'solution')}` })
    }
  }
  for (const n of nodes) {
    const s = strat(n)
    if (s?.kind !== 'question') continue
    const deadParent = parentsOf(n.id).some((p) => refuted.has(p.id))
    const invalid = s.answered && s.validity === 'invalid'
    if (!deadParent && !invalid) continue
    const gatedBets = edges.filter((e) => e.source === n.id && kind(e) === 'dependency').length
    out.push({
      id: n.id, tag: tagOf(n), kind: 'question', title: s.title,
      fate: invalid ? 'mooted — answered, answer invalid' : 'mooted — its problem detonated',
      cost: gatedBets ? `held ${plural(gatedBets, 'bet')} at the gate` : 'held nothing',
    })
  }
  const gates = deriveGates(nodes, edges)
  for (const n of nodes) {
    const b = bet(n)
    if (!b) continue
    if (b.status === 'resolved' && b.outcome === 'loss') {
      const lock = b.lockedAt ? Date.parse(b.lockedAt) : NaN
      const done = b.resolvedAt ? Date.parse(b.resolvedAt) : NaN
      const cost = Number.isFinite(lock) && Number.isFinite(done)
        ? `${Math.max(1, Math.round((done - lock) / DAY))} days on the clock`
        : `≈ ${maturationOf(b, now).days} days on the clock (${Number.isFinite(lock) ? 'no resolve date' : 'no lock date'})`
      out.push({ id: n.id, tag: tagOf(n), kind: 'bet', title: b.change, fate: `lost — ${b.call || 'folded'}`, cost })
    } else if ((b.status === 'draft' || b.status === 'ready') && gates.get(n.id) === 'pruned') {
      const killers = edges.filter((e) => e.target === n.id && kind(e) === 'dependency').map((e) => byId.get(e.source)).filter(Boolean).map((k) => tagOf(k!))
      out.push({ id: n.id, tag: tagOf(n), kind: 'bet', title: b.change, fate: `never run — pruned by ${killers.join(', ') || 'an upstream loss'}`, cost: '0 days · the avoided cost' })
    }
  }
  return out
}
