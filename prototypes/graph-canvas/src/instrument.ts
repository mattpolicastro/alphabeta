// The instrument ladder (grammar v0.3). Pure data + the one rule the lock reads:
// a rung with a counterfactual demands a fold-if; one without demands an expectation;
// a study demands an evidence bar.
//
// apps/web/lib/instrument/feasibility.ts (@ bfb80fb) has `fit`/`suggest`, but they
// score against a feasibility context (randomize / traffic / urgency / claim) that
// the canvas doesn't carry — v0.3 says that context is correctly absent from the
// graph. Not quarried; the picker stays explicit until a capability context exists.
import type { InstrumentType } from './model'

export type Demand = 'foldIf' | 'expectation' | 'evidenceBar'

export interface Rung {
  type: InstrumentType
  rung: number
  label: string
  ceremony: string
  ceiling: string
  demand: Demand
}

export const RUNGS: Rung[] = [
  { type: 'ab',       rung: 5, label: 'A/B — randomized',           ceremony: 'fold-if required',                       ceiling: 'valid (causal)',  demand: 'foldIf' },
  { type: 'quasi',    rung: 4, label: 'quasi — unit-level assignment', ceremony: 'fold-if required',                    ceiling: 'valid, caveated', demand: 'foldIf' },
  { type: 'holdback', rung: 4, label: 'holdback — withheld slice',   ceremony: 'fold-if required',                       ceiling: 'valid, caveated', demand: 'foldIf' },
  { type: 'study',    rung: 3, label: 'study — interviews, usability, survey', ceremony: 'evidence bar instead of a threshold', ceiling: 'qualitative', demand: 'evidenceBar' },
  { type: 'prepost',  rung: 2, label: 'pre/post — observational',    ceremony: 'expectation required; no fold-if',       ceiling: 'anecdotal',       demand: 'expectation' },
  { type: 'none',     rung: 1, label: 'none — ship and watch',       ceremony: 'expectation required; ledger row',       ceiling: 'anecdotal',       demand: 'expectation' },
]

const byType = new Map(RUNGS.map((r) => [r.type, r]))

export function rung(type: InstrumentType): Rung {
  const r = byType.get(type)
  if (!r) throw new Error(`instrument: unknown rung "${type}"`)
  return r
}

export const hasCounterfactual = (type: InstrumentType) => rung(type).demand === 'foldIf'

// one line for the cockpit / ledger
export function rungLine(type: InstrumentType): string {
  const r = rung(type)
  return `${r.type} · rung ${r.rung} · ${r.ceiling}`
}

// What the lock refuses without. Returns the missing demand, or null when satisfied.
export function missingDemand(type: InstrumentType, p: { foldIf: string; expectation: string; evidenceBar: string }): Demand | null {
  const d = rung(type).demand
  return p[d].trim() ? null : d
}
