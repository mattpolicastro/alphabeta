import { describe, expect, it } from 'vitest'
import type { BetRecord } from '../model'
import { committedFields, foldIfFor, lockPatch, sealOf } from '../lock'
import { missingDemand, rung, rungLine } from '../instrument'

const draft: BetRecord = {
  change: 'x', direction: 'lift', metric: 'open rate', magnitude: '3%', mechanism: '', foldIf: '(not yet declared)',
  surface: 'email', status: 'draft', outcome: null, criteria: { win: '', inconclusive: '', loss: '' },
}
const input = { instrument: 'ab' as const, foldIf: '+1pp', expectation: '', evidenceBar: '', confidence: '0.6', guardrails: 'unsubscribes hold', win: 'keep if ≥ 1pp', inconclusive: 'hold', loss: 'revert', premortem: 'nobody opened them' }

describe('instrument ladder', () => {
  it('counterfactual rungs demand a fold-if; the rest an expectation or evidence bar', () => {
    expect(missingDemand('ab', { foldIf: '', expectation: 'x', evidenceBar: '' })).toBe('foldIf')
    expect(missingDemand('quasi', { foldIf: 'y', expectation: '', evidenceBar: '' })).toBeNull()
    expect(missingDemand('prepost', { foldIf: 'y', expectation: '', evidenceBar: '' })).toBe('expectation')
    expect(missingDemand('none', { foldIf: '', expectation: 'x', evidenceBar: '' })).toBeNull()
    expect(missingDemand('study', { foldIf: '', expectation: '', evidenceBar: '' })).toBe('evidenceBar')
  })
  it('rung metadata matches the v0.3 table', () => {
    expect(rung('ab').rung).toBe(5); expect(rung('none').rung).toBe(1)
    expect(rungLine('holdback')).toBe('holdback · rung 4 · valid, caveated')
  })
})

describe('lockPatch', () => {
  it('freezes the commitment, compiles rules, keeps the premortem', () => {
    const p = lockPatch(draft, input, '2026-09-04T00:00:00.000Z')
    expect(p.status).toBe('locked')
    expect(p.instrument).toEqual({ type: 'ab' })
    expect(p.foldIf).toBe('+1pp')
    expect(p.criteria).toEqual({ win: 'keep if ≥ 1pp', inconclusive: 'hold', loss: 'revert' })
    expect(p.decisionRules?.[0]).toMatchObject({ bucket: 'win', threshold: 1, comparator: 'gte', metric: 'open rate' })
    expect(p.premortem).toBe('nobody opened them')
    expect(p.expectation).toBeUndefined()
  })
  it('a no-counterfactual rung stores the expectation and an explicit non-fold-if', () => {
    const p = lockPatch(draft, { ...input, instrument: 'prepost', foldIf: '', expectation: 'opens tick up a little' }, 'now')
    expect(p.expectation).toBe('opens tick up a little')
    expect(p.foldIf).toMatch(/^\(none — prepost/)
    expect(foldIfFor('study', '')).toMatch(/evidence bar instead/)
  })
})

describe('seal', () => {
  it('covers committed fields and moves when one does; ignores amendments', async () => {
    const locked = { ...draft, ...lockPatch(draft, input, 'now') } as BetRecord
    const a = await sealOf(locked)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(await sealOf({ ...locked, amendments: [{ ts: 't', field: 'runtime', change: '14→21', reason: 'traffic' }] })).toBe(a)
    expect(await sealOf({ ...locked, foldIf: '+2pp' })).not.toBe(a)
    expect(Object.keys(committedFields(locked))).not.toContain('status')
  })
})
