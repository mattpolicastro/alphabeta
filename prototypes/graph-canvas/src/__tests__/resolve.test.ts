import { describe, expect, it } from 'vitest'
import type { BetRecord } from '../model'
import { committedReference, suggestBucket } from '../resolve'

const base: BetRecord = {
  change: 'x', direction: 'lift', metric: 'conversion', magnitude: '2pp', mechanism: '', foldIf: 'fold if under +1pp',
  surface: '', status: 'locked', outcome: null, criteria: { win: '', inconclusive: '', loss: '' },
  instrument: { type: 'ab' },
}
const prepost: BetRecord = { ...base, instrument: { type: 'prepost' }, foldIf: '(none — prepost has no counterfactual; expectation instead)', expectation: 'conversion up about +2pp' }
const study: BetRecord = { ...base, instrument: { type: 'study' }, foldIf: '(none)', evidenceBar: '4 of 6 interviewees, unprompted' }

describe('committedReference — what the rung recorded', () => {
  it('ab reads the fold-if; prepost/none the expectation; study the evidence bar', () => {
    expect(committedReference(base)).toEqual({ demand: 'foldIf', label: 'fold-if', text: 'fold if under +1pp' })
    expect(committedReference(prepost)).toMatchObject({ demand: 'expectation', label: 'expectation', text: 'conversion up about +2pp' })
    expect(committedReference({ ...prepost, instrument: { type: 'none' } }).demand).toBe('expectation')
    expect(committedReference(study)).toMatchObject({ demand: 'evidenceBar', text: '4 of 6 interviewees, unprompted' })
  })
  it('a bet locked before the ladder falls back to the fold-if; a missing line says so', () => {
    expect(committedReference({ ...base, instrument: undefined }).demand).toBe('foldIf')
    expect(committedReference({ ...prepost, expectation: undefined }).text).toBe('(not recorded at lock)')
  })
})

describe('suggestBucket — fold-if rungs', () => {
  it('clears the fold-if → win; under it → loss', () => {
    expect(suggestBucket(base, 'conversion +3.1pp (95%)')).toMatchObject({ bucket: 'win' })
    expect(suggestBucket(base, 'conversion +0.4pp (95%)')).toMatchObject({ bucket: 'loss', why: expect.stringMatching(/under the fold-if/) })
  })
  it('wrong direction is a loss even when large', () => {
    expect(suggestBucket(base, 'conversion −2.5pp')).toMatchObject({ bucket: 'loss', why: expect.stringMatching(/wrong way/) })
  })
  it('a reduce bet reads a drop as the expected direction', () => {
    const reduce = { ...base, direction: 'reduce' as const, foldIf: 'fold if it drops by less than 1pp' }
    expect(suggestBucket(reduce, 'time-to-close −2pp')).toMatchObject({ bucket: 'win' })
    expect(suggestBucket(reduce, 'time-to-close +2pp')).toMatchObject({ bucket: 'loss' })
  })
  it('n.s. → inconclusive; no number → no suggestion', () => {
    expect(suggestBucket(base, '+0.9pp, n.s.')).toMatchObject({ bucket: 'inconclusive' })
    expect(suggestBucket(base, 'looked fine')).toMatchObject({ bucket: null, why: expect.stringMatching(/no signed number/) })
  })
  it('a fold-if without a number cannot be checked', () => {
    expect(suggestBucket({ ...base, foldIf: 'fold if nobody uses it' }, '+3pp')).toMatchObject({ bucket: null })
  })
})

describe('suggestBucket — expectation rungs compare against the expectation, not the fold-if placeholder', () => {
  it('meets the expectation → win; right direction but short → inconclusive (no counterfactual)', () => {
    expect(suggestBucket(prepost, 'conversion +2.4pp')).toMatchObject({ bucket: 'win', why: expect.stringMatching(/meets the expectation/) })
    expect(suggestBucket(prepost, 'conversion +0.5pp')).toMatchObject({ bucket: 'inconclusive', why: expect.stringMatching(/short of the expectation/) })
  })
  it('opposite to the expectation → loss', () => {
    expect(suggestBucket(prepost, 'conversion −1pp')).toMatchObject({ bucket: 'loss' })
  })
  it('an expectation with a direction but no number: moved that way → win', () => {
    expect(suggestBucket({ ...prepost, expectation: 'opens tick up a little' }, '+1pp')).toMatchObject({ bucket: 'win', why: expect.stringMatching(/gave no number/) })
  })
  it('the placeholder fold-if never leaks into the comparison', () => {
    expect(suggestBucket(prepost, '+2.4pp').why).not.toMatch(/fold-if/)
  })
})

describe('suggestBucket — study', () => {
  it('an evidence bar is judged, not computed', () => {
    expect(suggestBucket(study, '5 of 6')).toMatchObject({ bucket: null, why: expect.stringMatching(/judged/) })
  })
})
