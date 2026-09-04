import { describe, expect, it } from 'vitest'
import type { Node } from '@xyflow/react'
import type { BetRecord } from '../model'
import { DAY, findContentions, maturationOf, windowOf } from '../contentions'

const NOW = Date.parse('2026-09-04T12:00:00Z')
const day = (d: number) => new Date(NOW + d * DAY).toISOString()

const bet = (id: string, b: Partial<BetRecord>): Node => ({
  id, type: 'bet', position: { x: 0, y: 0 },
  data: { bet: { change: id, direction: 'lift', metric: 'm', magnitude: '1%', mechanism: '', foldIf: '+1pp', surface: 'pricing', status: 'locked', outcome: null, criteria: { win: '', inconclusive: '', loss: '' }, ...b } },
})
const b0 = bet('x', {}).data.bet as BetRecord

describe('maturationOf', () => {
  it('defaults to 14 days, labelled default', () => {
    expect(maturationOf(b0, NOW)).toEqual({ days: 14, source: 'default' })
  })
  it('reads a declared expectedResolveBy relative to the lock', () => {
    expect(maturationOf({ ...b0, lockedAt: day(0), expectedResolveBy: day(21) }, NOW)).toEqual({ days: 21, source: 'declared' })
    expect(maturationOf({ ...b0, expectedResolveBy: day(3) }, NOW)).toEqual({ days: 3, source: 'declared' })
  })
  it('reads the lab runtime: detectable-lift days, sample-size n/traffic', () => {
    expect(maturationOf({ ...b0, instrument: { type: 'ab', spec: { from: 'detectable-lift', v: 1, params: { days: 30 } } } }, NOW)).toEqual({ days: 30, source: 'lab' })
    const ss = { from: 'sample-size', v: 1, params: { baseline: 0.02, mde: 0.1, mdeKind: 'relative', variants: 2, tails: 2, alpha: 0.05, power: 0.8, traffic: 5000 } }
    expect(maturationOf({ ...b0, instrument: { type: 'ab', spec: ss } }, NOW)).toEqual({ days: 33, source: 'lab' })
  })
  it('reads a duration out of a spec line', () => {
    expect(maturationOf({ ...b0, instrument: { type: 'ab', spec: '50/50 by visitor · 14 days' } }, NOW)).toEqual({ days: 14, source: 'spec' })
    expect(maturationOf({ ...b0, instrument: { type: 'holdback', spec: '10% held on the old flow for 3 weeks' } }, NOW)).toEqual({ days: 21, source: 'spec' })
    expect(maturationOf({ ...b0, instrument: { type: 'ab', spec: 'by send cohort' } }, NOW).source).toBe('default')
  })
  it('anchors a bet with no lock date at now', () => {
    expect(windowOf(b0, NOW)).toMatchObject({ start: NOW, end: NOW + 14 * DAY })
  })
})

describe('findContentions', () => {
  it('two live bets on one surface at overlapping times', () => {
    const ns = [bet('a', { lockedAt: day(-5) }), bet('b', { lockedAt: day(0), status: 'running' })]
    const c = findContentions(ns, NOW)
    expect(c).toHaveLength(1)
    expect(c[0]).toMatchObject({ surface: 'pricing', start: NOW, end: NOW + 9 * DAY })
    expect([c[0].a.id, c[0].b.id]).toEqual(['a', 'b'])
  })
  it('no contention across surfaces, or when either is off the clock', () => {
    expect(findContentions([bet('a', {}), bet('b', { surface: 'email' })], NOW)).toEqual([])
    expect(findContentions([bet('a', {}), bet('b', { status: 'draft' })], NOW)).toEqual([])
    expect(findContentions([bet('a', {}), bet('b', { status: 'resolved', outcome: 'win' })], NOW)).toEqual([])
    expect(findContentions([bet('a', { surface: '' }), bet('b', { surface: '' })], NOW)).toEqual([])
  })
  it('same surface, disjoint windows → none; surface match is case/space-insensitive', () => {
    expect(findContentions([bet('a', { lockedAt: day(-40) }), bet('b', { lockedAt: day(0) })], NOW)).toEqual([])
    expect(findContentions([bet('a', { surface: ' Pricing ' }), bet('b', { surface: 'pricing' })], NOW)).toHaveLength(1)
  })
  it('three bets on one surface → three pairs, sorted by overlap start', () => {
    const ns = [bet('a', { lockedAt: day(-2) }), bet('b', { lockedAt: day(-1) }), bet('c', { lockedAt: day(3) })]
    const c = findContentions(ns, NOW)
    expect(c.map((x) => [x.a.id, x.b.id])).toEqual([['a', 'b'], ['a', 'c'], ['b', 'c']])
    expect(c[1].start).toBe(NOW + 3 * DAY)
  })
})
