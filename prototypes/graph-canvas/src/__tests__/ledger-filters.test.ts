import { describe, expect, it } from 'vitest'
import type { Node } from '@xyflow/react'
import { EMPTY_FILTER, UNSET, distinctSurfaces, filterBets, groupBetsByStatus, toggle } from '../ledger-filters'

const mk = (id: string, bet: Record<string, unknown>): Node => ({ id, type: 'bet', position: { x: 0, y: 0 }, data: { bet } })
const bets = [
  mk('a', { status: 'draft', surface: 'pricing' }),
  mk('b', { status: 'locked', surface: 'pricing', instrument: { type: 'ab' } }),
  mk('c', { status: 'resolved', surface: 'email', instrument: { type: 'prepost' } }),
  mk('d', { status: 'resolved', surface: '', instrument: { type: 'ab' } }),
]
const ids = (ns: Node[]) => ns.map((n) => n.id)

describe('filterBets', () => {
  it('an empty filter returns the input unchanged', () => {
    expect(filterBets(bets, EMPTY_FILTER)).toBe(bets)
  })
  it('filters by status', () => {
    expect(ids(filterBets(bets, { ...EMPTY_FILTER, statuses: ['resolved'] }))).toEqual(['c', 'd'])
  })
  it('filters by surface, with a blank surface addressable as unset', () => {
    expect(ids(filterBets(bets, { ...EMPTY_FILTER, surfaces: ['email'] }))).toEqual(['c'])
    expect(ids(filterBets(bets, { ...EMPTY_FILTER, surfaces: [UNSET] }))).toEqual(['d'])
  })
  it('filters by instrument rung, with undeclared addressable as unset', () => {
    expect(ids(filterBets(bets, { ...EMPTY_FILTER, instruments: ['ab'] }))).toEqual(['b', 'd'])
    expect(ids(filterBets(bets, { ...EMPTY_FILTER, instruments: [UNSET] }))).toEqual(['a'])
  })
  it('axes intersect; values within an axis union', () => {
    expect(ids(filterBets(bets, { statuses: ['resolved'], surfaces: ['pricing', 'email'], instruments: [] }))).toEqual(['c'])
    expect(ids(filterBets(bets, { statuses: ['draft', 'locked'], surfaces: [], instruments: [] }))).toEqual(['a', 'b'])
  })
})

describe('groupBetsByStatus', () => {
  it('buckets every status, preserving order', () => {
    const g = groupBetsByStatus(bets)
    expect(ids(g.resolved)).toEqual(['c', 'd'])
    expect(g.ready).toEqual([])
    expect(Object.keys(g)).toEqual(['draft', 'ready', 'locked', 'running', 'resolved'])
  })
})

describe('helpers', () => {
  it('distinctSurfaces keeps first-seen order and names the blank', () => {
    expect(distinctSurfaces(bets)).toEqual(['pricing', 'email', UNSET])
  })
  it('toggle adds then removes', () => {
    expect(toggle(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggle(['a', 'b'], 'a')).toEqual(['b'])
  })
})
