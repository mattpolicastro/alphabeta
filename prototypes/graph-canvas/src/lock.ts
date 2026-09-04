// What the lock ceremony writes, as a pure patch — and the seal over it.
// The seal is a SHA-256 of the committed fields only (not status, not amendments),
// so the cockpit can re-verify that nothing committed moved after the lock.
import type { BetRecord, Instrument, InstrumentType } from './model'
import { compileCriteria } from './criteria'
import { hasCounterfactual, rung } from './instrument'
import { fingerprint } from './portable'

export interface LockInput {
  instrument: InstrumentType
  spec?: string
  foldIf: string
  expectation: string
  evidenceBar: string
  confidence: string
  guardrails: string
  win: string
  inconclusive: string
  loss: string
  premortem?: string
}

// Rungs without a counterfactual carry no fold-if; the field says so rather than lying blank.
export function foldIfFor(type: InstrumentType, foldIf: string): string {
  if (hasCounterfactual(type)) return foldIf.trim()
  return `(none — ${type} has no counterfactual; ${rung(type).demand === 'evidenceBar' ? 'evidence bar' : 'expectation'} instead)`
}

export function lockPatch(bet: BetRecord, p: LockInput, lockedAt: string): Partial<BetRecord> {
  const instrument: Instrument = p.spec?.trim() ? { type: p.instrument, spec: p.spec.trim() } : { type: p.instrument }
  const criteria = { win: p.win, inconclusive: p.inconclusive, loss: p.loss }
  const patch: Partial<BetRecord> = {
    instrument,
    foldIf: foldIfFor(p.instrument, p.foldIf),
    confidence: p.confidence,
    guardrails: p.guardrails,
    criteria,
    decisionRules: compileCriteria({ criteria, metric: bet.metric, direction: bet.direction }),
    status: 'locked',
    lockedAt,
  }
  if (p.expectation.trim()) patch.expectation = p.expectation.trim()
  if (p.evidenceBar.trim()) patch.evidenceBar = p.evidenceBar.trim()
  if (p.premortem?.trim()) patch.premortem = p.premortem.trim()
  return patch
}

// The fields the lock freezes. Amendments, actuals, status live outside the seal.
export function committedFields(b: BetRecord) {
  return {
    change: b.change, direction: b.direction, metric: b.metric, magnitude: b.magnitude, mechanism: b.mechanism,
    foldIf: b.foldIf, confidence: b.confidence ?? '', guardrails: b.guardrails ?? '',
    instrument: b.instrument ?? null, expectation: b.expectation ?? '', evidenceBar: b.evidenceBar ?? '',
    criteria: b.criteria, decisionRules: b.decisionRules ?? [], lockedAt: b.lockedAt ?? '',
  }
}

export const sealOf = (b: BetRecord) => fingerprint(committedFields(b))
