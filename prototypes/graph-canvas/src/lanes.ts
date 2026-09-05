// Altitude lanes — the grammar's kinds, drawn as bands on the board.
//
// These are the same constants the tree layout places nodes on (relayout() in
// App.tsx imports them from here), so the bands and the cards can never drift:
// one source, two readers.

export type Orient = 'v' | 'h'

// vertical (default): kinds are rows, bets step down by generation
export const LANE_Y: Record<string, number> = { goal: 0, problem: 200, child: 420 }
export const BET_Y0 = 680
export const BET_GEN = 260
// horizontal: kinds are columns, bets step right by generation
export const LANE_X: Record<string, number> = { goal: 0, problem: 330, child: 660 }
export const BET_X0 = 990
export const BET_GENX = 320

export interface LaneBand {
  key: string
  label: string
  /** band edge in board coordinates, along the altitude axis (y when vertical, x when horizontal) */
  start: number
  end: number
}

/**
 * The bands for one orientation, in altitude order. Boundaries fall midway
 * between adjacent lane coordinates; the two outer edges mirror the gap they
 * face, so a card never sits on a boundary.
 */
export function laneBands(orient: Orient, generations: number): LaneBand[] {
  const h = orient === 'h'
  const lane = h ? LANE_X : LANE_Y
  const bet0 = h ? BET_X0 : BET_Y0
  const step = h ? BET_GENX : BET_GEN
  const gens = Math.max(1, Math.floor(generations))

  const stops = [
    { key: 'goal', label: 'goals', at: lane.goal },
    { key: 'problem', label: 'problems', at: lane.problem },
    { key: 'child', label: 'questions · solutions', at: lane.child },
    ...Array.from({ length: gens }, (_, i) => ({
      key: `bet-${i}`,
      label: i === 0 ? 'bets' : `bets · gen ${i + 1}`,
      at: bet0 + step * i,
    })),
  ]

  return stops.map((s, i) => {
    const prev = stops[i - 1]
    const next = stops[i + 1]
    return {
      key: s.key,
      label: s.label,
      start: prev ? (prev.at + s.at) / 2 : s.at - (next.at - s.at) / 2,
      end: next ? (s.at + next.at) / 2 : s.at + (s.at - prev.at) / 2,
    }
  })
}

/**
 * How many bet generations the board is showing, read off the cards themselves
 * rather than recomputing the lineage the layout already walked.
 */
export function betGenerations(positions: { x: number; y: number }[], orient: Orient): number {
  const h = orient === 'h'
  const base = h ? BET_X0 : BET_Y0
  const step = h ? BET_GENX : BET_GEN
  let max = 0
  for (const p of positions) max = Math.max(max, ((h ? p.x : p.y) - base) / step)
  return Math.min(8, Math.max(1, Math.round(max) + 1))
}
