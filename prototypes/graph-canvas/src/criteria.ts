// Compile decision-criteria prose into machine-checkable rules at lock.
//
// The prose is canonical and never altered; this is a shadow of it. The parser is
// deliberately conservative: it takes a number only when the prose marks it as a
// threshold — a comparator ("at least", "≥", "more than"), an explicit sign
// ("+2pp"), or a direction word in the same sentence ("lift of 2pp"). A bare
// number with none of those ("roll out to 100% this week") is an action, not a
// threshold, and yields null. It never invents a number.
//
// Conventions: `threshold` is a magnitude (never negative); `direction` carries
// the sign. "drops at all" → decrease, > 0. "no change" is recognized but has no
// noise band, so it compiles to nulls — not machine-checkable as written.
import type { BetRecord, DecisionRule } from './model'

export type Direction = DecisionRule['direction']
export type Comparator = DecisionRule['comparator']

export interface Parsed {
  direction: Direction | null // null = prose gave no direction
  threshold: number | null
  unit: string | null
  comparator: Comparator
}

const DOWN = /\b(drop|drops|dropped|fall|falls|fell|decrease|decreases|decline|declines|down|lower|reduce|reduces|reduction|worse|shrink|shrinks|loss of)\b/i
const UP = /\b(lift|lifts|rise|rises|increase|increases|up|gain|gains|higher|improve|improves|improvement|grow|grows|growth|more)\b/i
const NO_CHANGE = /\b(no change|unchanged|flat|no movement|no difference|stays? (the )?same)\b/i
const AT_ALL = /\b(at all|any (drop|decrease|decline|fall|lift|rise|increase|gain|movement|change))\b/i

const GTE = '(?:at least|no less than|not less than|minimum of|a minimum|>=)'
const LTE = '(?:at most|no more than|not more than|maximum of|a maximum|<=)'
const GT = '(?:more than|over|above|exceeds?|exceeding|beyond|>)'
const LT = '(?:less than|under|below|fewer than|short of|<)'
const NUM = '([+-])?\\s*(\\d+(?:\\.\\d+)?)\\s*(pp|percentage points?|p\\.p\\.|%|percent|pts?|points?|x|×|days?|seconds?|s|ms)?'
const CAND = new RegExp(`(?:(${GTE})|(${LTE})|(${GT})|(${LT}))?\\s*${NUM}(?![\\w.])\\s*(or more|or better|or higher|or less|or worse|or lower)?`, 'gi')

function normalize(s: string): string {
  return s
    .replace(/[−–]/g, '-') // minus / en dash
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/\s+/g, ' ')
    .trim()
}

function unitOf(raw: string | undefined): string | null {
  if (!raw) return null
  const u = raw.toLowerCase()
  if (u === 'pp' || u.startsWith('percentage') || u === 'p.p.') return 'pp'
  if (u === '%' || u === 'percent') return '%'
  if (u.startsWith('pt') || u.startsWith('point')) return 'pts'
  if (u === 'x' || u === '×') return 'x'
  return u
}

export function parseCriterion(prose: string): Parsed {
  const text = normalize(prose)
  const dirWord: Direction | null = DOWN.test(text) ? 'decrease' : UP.test(text) ? 'increase' : null
  const none: Parsed = { direction: dirWord, threshold: null, unit: null, comparator: null }
  if (!text) return none
  if (NO_CHANGE.test(text)) return none
  if (AT_ALL.test(text)) return { direction: dirWord ?? 'increase', threshold: 0, unit: null, comparator: 'gt' }

  type C = { cmp: Comparator; sign: string | undefined; n: number; unit: string | null; marked: boolean }
  const cands: C[] = []
  for (const m of text.matchAll(CAND)) {
    const [, gte, lte, gt, lt, sign, num, unit, tail] = m
    let cmp: Comparator = gte ? 'gte' : lte ? 'lte' : gt ? 'gt' : lt ? 'lt' : null
    if (!cmp && tail) cmp = /less|worse|lower/i.test(tail) ? 'lte' : 'gte'
    cands.push({ cmp, sign, n: Number(num), unit: unitOf(unit), marked: !!cmp || !!sign })
  }
  const marked = cands.find((c) => c.marked)
  const pick = marked ?? (cands.length === 1 && dirWord && cands[0].unit ? cands[0] : null)
  if (!pick) return none
  const direction: Direction | null = pick.sign === '-' ? 'decrease' : pick.sign === '+' ? 'increase' : dirWord
  return { direction, threshold: Math.abs(pick.n), unit: pick.unit, comparator: pick.cmp ?? 'gte' }
}

const BUCKETS = ['win', 'inconclusive', 'loss'] as const

// One rule per bucket. `direction` falls back to the bet's own when the prose has none.
export function compileCriteria(bet: Pick<BetRecord, 'criteria' | 'metric' | 'direction'>): DecisionRule[] {
  const fallback: Direction = bet.direction === 'reduce' ? 'decrease' : 'increase'
  return BUCKETS.map((bucket) => {
    const prose = bet.criteria[bucket] ?? ''
    const p = parseCriterion(prose)
    return { bucket, prose, metric: bet.metric, direction: p.direction ?? fallback, threshold: p.threshold, unit: p.unit, comparator: p.comparator }
  })
}

const SYM: Record<NonNullable<Comparator>, string> = { gte: '≥', lte: '≤', gt: '>', lt: '<' }

// mono one-liner for the cockpit; null when not machine-checkable
export function ruleLine(r: Pick<DecisionRule, 'metric' | 'direction' | 'threshold' | 'unit' | 'comparator'>): string | null {
  if (r.threshold === null || r.comparator === null) return null
  const arrow = r.direction === 'increase' ? 'Δ↑' : 'Δ↓'
  return `${arrow} ${r.metric} ${SYM[r.comparator]} ${r.threshold}${r.unit ?? ''}`
}
