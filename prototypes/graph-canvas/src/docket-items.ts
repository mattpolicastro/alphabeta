// The docket as a due-list, not a gantt: every row is an obligation with an action.
// Adapted from the bar-building loop in src/Docket.tsx (the gantt, kept behind the
// timeline toggle) — same maturation source (src/contentions.ts `maturationOf`),
// same gate derivation (src/model.ts `deriveGates`), but the output is what is owed,
// by urgency, instead of where a bar sits. This is where the tool nags.
import type { Edge, Node } from '@xyflow/react'
import { DAY, findContentions, maturationOf } from './contentions'
import { deriveGates, type BetRecord, type StratRecord } from './model'

export type Urgency = 'overdue' | 'this-week' | 'later' | 'gated' | 'off-clock'
export type DueAction = 'resolve' | 'answer' | 'amend' | 'unblock' | 'lock' | 'revisit'
export type DueKind = 'maturation' | 'gated' | 'unlaunched' | 'question' | 'contention'

export interface DueItem {
  id: string
  kind: DueKind
  nodeId: string
  due?: string // ISO
  ageDays?: number
  urgency: Urgency
  action: DueAction
  reason: string
  blockedBy?: string[]
}

export const URGENCIES: Urgency[] = ['overdue', 'this-week', 'later', 'gated', 'off-clock']
export const URGENCY_LABEL: Record<Urgency, string> = {
  overdue: 'overdue', 'this-week': 'this week', later: 'later', gated: 'gated', 'off-clock': 'off the clock',
}
// what an empty group says — pencil register
export const URGENCY_EMPTY: Record<Urgency, string> = {
  overdue: 'nothing overdue — good',
  'this-week': 'nothing comes due this week',
  later: 'nothing further out — lock something',
  gated: 'nothing waits on another bet',
  'off-clock': 'no owned open questions',
}

const betOf = (n: Node) => (n.data as any)?.bet as BetRecord | undefined
const stratOf = (n: Node) => (n.data as any)?.strat as StratRecord | undefined

// B3 / Q1 / S2 — the per-kind sequence tag the canvas assigns; '·' before it has one
export function tagOf(n: Node): string {
  const s = (n.data as any)?.seq ?? '·'
  if (n.type === 'bet') return `B${s}`
  const k = stratOf(n)?.kind ?? '?'
  return `${k[0].toUpperCase()}${s}`
}

const mmdd = (t: number) => new Date(t).toISOString().slice(5, 10)
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`

const MAT_SOURCE: Record<string, string> = { declared: 'declared at lock', lab: 'from the lab', spec: 'from the spec', default: 'default' }

export function dueItems(nodes: Node[], edges: Edge[], now = Date.now()): DueItem[] {
  const gates = deriveGates(nodes, edges)
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const blockersOf = (id: string) =>
    edges.filter((e) => e.target === id && (e.data as any)?.kind === 'dependency').map((e) => e.source).filter((s) => byId.has(s))
  const out: DueItem[] = []

  for (const n of nodes) {
    const b = betOf(n)
    if (!b) continue
    if (b.status === 'locked' || b.status === 'running') {
      const m = maturationOf(b, now)
      const from = b.lockedAt ? Date.parse(b.lockedAt) : now
      const due = (Number.isFinite(from) ? from : now) + m.days * DAY
      const delta = due - now
      const src = MAT_SOURCE[m.source]
      if (delta < 0) {
        out.push({ id: `maturation:${n.id}`, kind: 'maturation', nodeId: n.id, due: new Date(due).toISOString(), urgency: 'overdue', action: 'resolve',
          reason: `matured ${plural(Math.floor(-delta / DAY), 'day')} ago (${m.days}d ${src}) — resolve it or amend the maturation` })
      } else {
        const days = Math.ceil(delta / DAY)
        out.push({ id: `maturation:${n.id}`, kind: 'maturation', nodeId: n.id, due: new Date(due).toISOString(), urgency: delta <= 7 * DAY ? 'this-week' : 'later', action: 'resolve',
          reason: `matures ${mmdd(due)} · in ${plural(days, 'day')} (${m.days}d ${src})${b.lockedAt ? '' : ' · no lock date'}` })
      }
    } else if (b.status === 'ready' || b.status === 'draft') {
      const g = gates.get(n.id)
      if (g === 'gated') {
        const blockedBy = blockersOf(n.id)
        out.push({ id: `gated:${n.id}`, kind: 'gated', nodeId: n.id, urgency: 'gated', action: 'unblock', blockedBy,
          reason: `waits on ${blockedBy.map((id) => tagOf(byId.get(id)!)).join(' AND ')} (loss would prune)` })
      } else if (g === 'open' && b.status === 'ready') {
        out.push({ id: `unlaunched:${n.id}`, kind: 'unlaunched', nodeId: n.id, urgency: 'later', action: 'lock', reason: 'ready — unlaunched, not on the clock until locked' })
      }
    }
  }

  for (const c of findContentions(nodes, now)) {
    const days = Math.ceil((c.end - c.start) / DAY)
    out.push({ id: `contention:${c.a.id}:${c.b.id}`, kind: 'contention', nodeId: c.a.id, urgency: 'this-week', action: 'revisit',
      due: new Date(c.start).toISOString(),
      reason: `${tagOf(c.a)} × ${tagOf(c.b)} both read ${c.surface} — overlap ${mmdd(c.start)} → ${mmdd(c.end)}, ${days}d; neither reads cleanly` })
  }

  for (const n of nodes) {
    const s = stratOf(n)
    if (!s || s.kind !== 'question' || s.answered) continue
    if (!s.owner && !s.expectation) continue // unowned, unexpected: nobody owes it yet
    const created = s.createdAt ? Date.parse(s.createdAt) : NaN
    const ageDays = Number.isFinite(created) ? Math.max(0, Math.floor((now - created) / DAY)) : undefined
    const who = s.owner ? `owned by ${s.owner}` : 'expectation stated, unowned'
    const age = ageDays === undefined ? 'age unknown' : `open ${plural(ageDays, 'day')}`
    out.push({ id: `question:${n.id}`, kind: 'question', nodeId: n.id, urgency: 'off-clock', action: 'answer', ageDays,
      reason: `${who}, ${age}${s.expectation ? '' : ' · expectation not yet stated'}` })
  }

  const rank = (u: Urgency) => URGENCIES.indexOf(u)
  const t = (iso?: string) => (iso ? Date.parse(iso) : Number.POSITIVE_INFINITY)
  return out.sort((a, b) => {
    if (a.urgency !== b.urgency) return rank(a.urgency) - rank(b.urgency)
    if (a.urgency === 'off-clock') return (b.ageDays ?? -1) - (a.ageDays ?? -1)
    if (a.urgency === 'gated') return a.nodeId.localeCompare(b.nodeId)
    return t(a.due) - t(b.due) // overdue: most overdue first; this-week / later: soonest first
  })
}

export const countBy = (items: DueItem[], u: Urgency) => items.filter((i) => i.urgency === u).length
