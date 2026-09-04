// adapted from apps/web/lib/journal/filter.ts @ 37e26b9 — pure filter + group helpers,
// re-shaped for canvas nodes (bet lives at node.data.bet) and widened from status-only
// to status / surface / instrument rung. An empty selection means "no filter".
import type { Node } from '@xyflow/react'
import type { BetRecord, BetStatus, InstrumentType } from './model'

export const ALL_STATUSES: BetStatus[] = ['draft', 'ready', 'locked', 'running', 'resolved']
export const UNSET = '—' // instrument / surface not declared

export interface LedgerFilter {
  statuses: BetStatus[]
  surfaces: string[]
  instruments: (InstrumentType | typeof UNSET)[]
}

export const EMPTY_FILTER: LedgerFilter = { statuses: [], surfaces: [], instruments: [] }

export const betOf = (n: Node) => (n.data as any).bet as BetRecord
export const surfaceOf = (b: BetRecord) => b.surface?.trim() || UNSET
export const instrumentOf = (b: BetRecord) => b.instrument?.type ?? UNSET

function pass<T>(allowed: T[], value: T): boolean {
  return allowed.length === 0 || allowed.includes(value)
}

export function filterBets(bets: Node[], f: LedgerFilter): Node[] {
  if (!f.statuses.length && !f.surfaces.length && !f.instruments.length) return bets
  return bets.filter((n) => {
    const b = betOf(n)
    return pass(f.statuses, b.status) && pass(f.surfaces, surfaceOf(b)) && pass(f.instruments, instrumentOf(b))
  })
}

// Buckets by status; insertion order preserved within each bucket.
export function groupBetsByStatus(bets: Node[]): Record<BetStatus, Node[]> {
  const groups: Record<BetStatus, Node[]> = { draft: [], ready: [], locked: [], running: [], resolved: [] }
  for (const n of bets) groups[betOf(n).status].push(n)
  return groups
}

// The values a filter row can offer, in first-seen order.
export function distinctSurfaces(bets: Node[]): string[] {
  return [...new Set(bets.map((n) => surfaceOf(betOf(n))))]
}

export function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}
