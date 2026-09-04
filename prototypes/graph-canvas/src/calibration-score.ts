// The calibration mirror's arithmetic: confidence said at lock against what happened.
// Adapted in shape from apps/web/lib/km/queries.ts @ 7a2cad8 (listResolvedBets →
// expected/actual records); the scoring is new. Shrinkage-aware it is not yet — at
// the corpus sizes a board has, the read says "too few" and means it.
import type { Node } from '@xyflow/react'
import type { BetRecord } from './model'

export interface CalPoint { id: string; tag: string; change: string; confidence: number; outcome: 0 | 1; label: string }

// '0.55' → 0.55; '55%' / '55' → 0.55; anything else → null
export function parseConfidence(s: string | undefined): number | null {
  if (!s) return null
  const m = /(-?\d+(?:\.\d+)?)\s*(%?)/.exec(s.trim())
  if (!m) return null
  let v = Number(m[1])
  if (m[2] === '%' || v > 1) v = v / 100
  return v >= 0 && v <= 1 ? v : null
}

export function calibrationPoints(nodes: Node[]): CalPoint[] {
  const out: CalPoint[] = []
  for (const n of nodes) {
    if (n.type !== 'bet') continue
    const b = (n.data as any).bet as BetRecord
    if (b.status !== 'resolved' || !b.outcome || b.outcome === 'invalid') continue
    const c = parseConfidence(b.confidence)
    if (c === null) continue
    out.push({ id: n.id, tag: `B${(n.data as any).seq ?? '·'}`, change: b.change, confidence: c, outcome: b.outcome === 'win' ? 1 : 0, label: b.outcome })
  }
  return out
}

export const brier = (pts: CalPoint[]): number | null =>
  pts.length ? pts.reduce((s, p) => s + (p.confidence - p.outcome) ** 2, 0) / pts.length : null

export interface CalBin { lo: number; hi: number; n: number; meanConfidence: number; winRate: number }

export function calibrationBins(pts: CalPoint[], k = 5): CalBin[] {
  const bins: CalBin[] = Array.from({ length: k }, (_, i) => ({ lo: i / k, hi: (i + 1) / k, n: 0, meanConfidence: 0, winRate: 0 }))
  for (const p of pts) {
    const b = bins[Math.min(k - 1, Math.floor(p.confidence * k))]
    b.n++; b.meanConfidence += p.confidence; b.winRate += p.outcome
  }
  for (const b of bins) if (b.n) { b.meanConfidence /= b.n; b.winRate /= b.n }
  return bins
}

export const MIN_N = 10

const pts = (x: number) => `${Math.round(x * 100)}`

// One line. Below MIN_N it refuses to characterise — that is the read.
export function calibrationRead(p: CalPoint[], min = MIN_N): string {
  const n = p.length
  if (n === 0) return 'n=0 — nothing resolved with a confidence yet'
  if (n < min) return `n=${n} — too few to say`
  const said = p.reduce((s, x) => s + x.confidence, 0) / n
  const won = p.reduce((s, x) => s + x.outcome, 0) / n
  const gap = said - won
  const verdict = Math.abs(gap) < 0.05 ? 'within 5 pts — calibrated, so far' : gap > 0 ? `overconfident by ${pts(gap)} pts` : `underconfident by ${pts(-gap)} pts`
  return `n=${n} · Brier ${brier(p)!.toFixed(2)} · said ${pts(said)}% on average, won ${pts(won)}% — ${verdict}`
}
