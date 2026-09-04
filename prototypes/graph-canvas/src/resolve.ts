// The resolve moment's arithmetic, pure: what did the lock commit to on this rung,
// and which bucket do the actuals fall in against it. A suggestion, not a verdict —
// the user still picks, and a deviation is recorded when the call differs.
import type { BetRecord, Outcome } from './model'
import { parseCriterion } from './criteria'
import { rung, type Demand } from './instrument'

export interface Reference {
  demand: Demand
  label: string // 'fold-if' | 'expectation' | 'evidence bar'
  text: string
}

const LABEL: Record<Demand, string> = { foldIf: 'fold-if', expectation: 'expectation', evidenceBar: 'evidence bar' }

// The committed line the bucket is read against — the fold-if on counterfactual
// rungs, the expectation on pre/post and none, the evidence bar on a study.
export function committedReference(bet: BetRecord): Reference {
  const demand: Demand = bet.instrument ? rung(bet.instrument.type).demand : 'foldIf'
  const text = demand === 'foldIf' ? bet.foldIf : demand === 'expectation' ? bet.expectation ?? '' : bet.evidenceBar ?? ''
  return { demand, label: LABEL[demand], text: text || '(not recorded at lock)' }
}

export interface Suggestion {
  bucket: Exclude<Outcome, null | 'invalid'> | null
  why: string
}

const NS = /\b(n\.?s\.?|not (statistically )?significant|no significant|inconclusive|within noise)\b/i

export function suggestBucket(bet: BetRecord, actuals: string): Suggestion {
  const ref = committedReference(bet)
  if (ref.demand === 'evidenceBar') return { bucket: null, why: 'an evidence bar is judged, not computed — pick by hand' }
  const expected = bet.direction === 'reduce' ? 'decrease' : 'increase'
  if (NS.test(actuals)) return { bucket: 'inconclusive', why: 'actuals are marked not significant' }
  const a = parseCriterion(actuals)
  if (a.threshold === null) return { bucket: null, why: 'no signed number in the actuals (write +3.1pp, −0.4pp, …)' }
  const actualDir = a.direction ?? expected
  const unsigned = a.direction === null ? ' (unsigned — read as the expected direction)' : ''
  if (actualDir !== expected) return { bucket: 'loss', why: `moved the wrong way: ${actualDir} where the bet said ${expected}` }
  if (a.threshold === 0) return { bucket: 'inconclusive', why: 'no movement' }

  const r = parseCriterion(ref.text)
  const unit = a.unit ?? ''
  if (r.threshold === null) {
    return ref.demand === 'foldIf'
      ? { bucket: null, why: `the fold-if has no number to check against${unsigned}` }
      : { bucket: 'win', why: `moved in the expected direction; the expectation gave no number${unsigned}` }
  }
  const meets = a.threshold >= r.threshold
  const cmp = `${a.threshold}${unit} vs ${r.threshold}${r.unit ?? ''}`
  if (ref.demand === 'foldIf')
    return meets
      ? { bucket: 'win', why: `clears the fold-if: ${cmp}${unsigned}` }
      : { bucket: 'loss', why: `under the fold-if: ${cmp} — fold${unsigned}` }
  return meets
    ? { bucket: 'win', why: `meets the expectation: ${cmp}${unsigned}` }
    : { bucket: 'inconclusive', why: `right direction, short of the expectation: ${cmp} — no counterfactual to call it a loss${unsigned}` }
}
