import { describe, expect, it } from 'vitest'
import { compileCriteria, parseCriterion, ruleLine } from '../criteria'

describe('parseCriterion', () => {
  it('≥ 1pp', () => {
    expect(parseCriterion('≥ 1pp')).toMatchObject({ threshold: 1, unit: 'pp', comparator: 'gte' })
  })
  it('+2pp — a signed magnitude reads as at-least', () => {
    expect(parseCriterion('+2pp checkout-start')).toMatchObject({ direction: 'increase', threshold: 2, unit: 'pp', comparator: 'gte' })
  })
  it('−1.5pp — sign carries direction, threshold stays a magnitude', () => {
    expect(parseCriterion('−1.5pp re-engagement')).toMatchObject({ direction: 'decrease', threshold: 1.5, unit: 'pp', comparator: 'gte' })
  })
  it('at least 3%', () => {
    expect(parseCriterion('keep if the lift is at least 3%')).toMatchObject({ direction: 'increase', threshold: 3, unit: '%', comparator: 'gte' })
  })
  it('less than 3% lift', () => {
    expect(parseCriterion('less than 3% lift')).toMatchObject({ direction: 'increase', threshold: 3, unit: '%', comparator: 'lt' })
  })
  it('drops by more than 2 points', () => {
    expect(parseCriterion('completion drops by more than 2 points')).toMatchObject({ direction: 'decrease', threshold: 2, unit: 'pts', comparator: 'gt' })
  })
  it('drops at all → decrease, > 0', () => {
    expect(parseCriterion('revert if conversion drops at all')).toEqual({ direction: 'decrease', threshold: 0, unit: null, comparator: 'gt' })
  })
  it('no change → recognized but not checkable (no noise band)', () => {
    expect(parseCriterion('no change — hold and re-test')).toMatchObject({ threshold: null, comparator: null })
  })
  it('an action with a number is not a threshold', () => {
    expect(parseCriterion('Keep — roll out to 100% this week.')).toMatchObject({ threshold: null, comparator: null })
  })
  it('a bare number with a direction word and a unit is a threshold', () => {
    expect(parseCriterion('a lift of 2pp on open rate')).toMatchObject({ direction: 'increase', threshold: 2, unit: 'pp', comparator: 'gte' })
  })
  it('two unmarked numbers → refuses to pick', () => {
    expect(parseCriterion('lift between 1pp and 3pp')).toMatchObject({ threshold: null })
  })
  it('the marked number wins over an action number', () => {
    expect(parseCriterion('roll out to 100% if lift ≥ 1pp')).toMatchObject({ threshold: 1, unit: 'pp', comparator: 'gte' })
  })
  it('"2pp or more"', () => {
    expect(parseCriterion('2pp or more')).toMatchObject({ threshold: 2, comparator: 'gte' })
  })
  it('empty and prose-only', () => {
    expect(parseCriterion('')).toMatchObject({ threshold: null, comparator: null })
    expect(parseCriterion('Revert — log why in the decision journal.')).toMatchObject({ threshold: null, comparator: null, direction: null })
  })
})

describe('compileCriteria', () => {
  const bet = {
    metric: 'checkout-start rate', direction: 'lift' as const,
    criteria: { win: 'keep if ≥ 2pp', inconclusive: 'no change — hold', loss: 'revert if it drops at all' },
  }
  it('one rule per bucket, prose kept verbatim', () => {
    const rules = compileCriteria(bet)
    expect(rules.map((r) => r.bucket)).toEqual(['win', 'inconclusive', 'loss'])
    expect(rules.map((r) => r.prose)).toEqual(['keep if ≥ 2pp', 'no change — hold', 'revert if it drops at all'])
    expect(rules[0]).toMatchObject({ metric: 'checkout-start rate', direction: 'increase', threshold: 2, comparator: 'gte' })
    expect(rules[1]).toMatchObject({ direction: 'increase', threshold: null, comparator: null })
    expect(rules[2]).toMatchObject({ direction: 'decrease', threshold: 0, comparator: 'gt' })
  })
  it("direction falls back to the bet's when the prose has none", () => {
    const r = compileCriteria({ ...bet, direction: 'reduce', criteria: { win: 'at least 30', inconclusive: '', loss: '' } })
    expect(r[0].direction).toBe('decrease')
  })
})

describe('ruleLine', () => {
  it('renders a checkable rule and null otherwise', () => {
    expect(ruleLine({ metric: 'open rate', direction: 'increase', threshold: 1, unit: 'pp', comparator: 'gte' })).toBe('Δ↑ open rate ≥ 1pp')
    expect(ruleLine({ metric: 'open rate', direction: 'decrease', threshold: 0, unit: null, comparator: 'gt' })).toBe('Δ↓ open rate > 0')
    expect(ruleLine({ metric: 'x', direction: 'increase', threshold: null, unit: null, comparator: null })).toBeNull()
  })
})
