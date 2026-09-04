// The docket's honesty: how long each bet is really on the clock, and which bets
// collide. Contention detection adapted from apps/web/lib/plan/contention.ts
// @ 9a1be84 (findContentions over plan entries with start/dur) — here over canvas
// bet nodes, live/running only, keyed on surface. Two bets on one surface at once
// cannot both be read cleanly; the docket says so instead of drawing two clean bars.
import type { Node } from '@xyflow/react'
import type { BetRecord } from './model'
import { perArm, type SampleSizeParams } from './funnel'

export const DAY = 86_400_000
export const DEFAULT_MATURATION_DAYS = 14

export type MaturationSource = 'declared' | 'lab' | 'spec' | 'default'
export interface Maturation { days: number; source: MaturationSource }

// declared at lock > the lab tool's runtime > a duration in the spec line > 14 default
export function maturationOf(bet: BetRecord, now = Date.now()): Maturation {
  if (bet.expectedResolveBy) {
    const due = Date.parse(bet.expectedResolveBy)
    const from = bet.lockedAt ? Date.parse(bet.lockedAt) : now
    if (Number.isFinite(due) && Number.isFinite(from)) return { days: Math.max(1, Math.ceil((due - from) / DAY)), source: 'declared' }
  }
  const spec = bet.instrument?.spec
  if (spec && typeof spec === 'object') {
    const p = spec.params
    if (typeof p.days === 'number' && p.days > 0) return { days: Math.ceil(p.days), source: 'lab' }
    if (spec.from === 'sample-size' && typeof p.traffic === 'number' && p.traffic > 0) {
      const n = perArm(p as unknown as SampleSizeParams)
      const variants = typeof p.variants === 'number' ? p.variants : 2
      if (Number.isFinite(n)) return { days: Math.ceil((n * variants) / p.traffic), source: 'lab' }
    }
  }
  if (typeof spec === 'string') {
    const m = /(\d+)\s*(d|day|days|w|wk|wks|week|weeks)\b/i.exec(spec)
    if (m) {
      const n = Number(m[1])
      return { days: /^w/i.test(m[2]) ? n * 7 : n, source: 'spec' }
    }
  }
  return { days: DEFAULT_MATURATION_DAYS, source: 'default' }
}

export const isOnClock = (b: BetRecord) => b.status === 'locked' || b.status === 'running'

// The window a live bet occupies: lock → lock + maturation, or now-anchored without a lock date.
export function windowOf(bet: BetRecord, now = Date.now()): { start: number; end: number; maturation: Maturation } {
  const maturation = maturationOf(bet, now)
  const lock = bet.lockedAt ? Date.parse(bet.lockedAt) : NaN
  const start = Number.isFinite(lock) ? lock : now
  return { start, end: start + maturation.days * DAY, maturation }
}

export interface Contention {
  a: Node
  b: Node
  surface: string
  start: number // overlap window
  end: number
}

const surfaceKey = (b: BetRecord) => b.surface.trim().toLowerCase()
const betOf = (n: Node) => (n.data as any)?.bet as BetRecord | undefined

export function findContentions(nodes: Node[], now = Date.now()): Contention[] {
  const live = nodes.filter((n) => n.type === 'bet' && betOf(n) && isOnClock(betOf(n)!) && surfaceKey(betOf(n)!))
  const out: Contention[] = []
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = betOf(live[i])!, b = betOf(live[j])!
      if (surfaceKey(a) !== surfaceKey(b)) continue
      const wa = windowOf(a, now), wb = windowOf(b, now)
      const start = Math.max(wa.start, wb.start), end = Math.min(wa.end, wb.end)
      if (end > start) out.push({ a: live[i], b: live[j], surface: a.surface.trim(), start, end })
    }
  }
  return out.sort((x, y) => x.start - y.start)
}
