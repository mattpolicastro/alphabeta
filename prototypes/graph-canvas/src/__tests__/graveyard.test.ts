import { describe, expect, it } from 'vitest'
import type { Edge, Node } from '@xyflow/react'
import { graveyardOf } from '../graveyard-entries'
import { DAY } from '../contentions'

const NOW = Date.parse('2026-09-04T12:00:00Z')
const strat = (id: string, kind: string, s: Record<string, unknown> = {}): Node => ({ id, type: 'strat', position: { x: 0, y: 0 }, data: { seq: 1, strat: { kind, title: id, ...s } } })
const bet = (id: string, b: Record<string, unknown>): Node => ({
  id, type: 'bet', position: { x: 0, y: 0 },
  data: { seq: Number(id.slice(1)), bet: { change: id, direction: 'lift', metric: 'm', magnitude: '1%', mechanism: '', foldIf: '+1pp', surface: '', outcome: null, criteria: { win: '', inconclusive: '', loss: '' }, ...b } },
})
const edge = (source: string, target: string, kind: string): Edge => ({ id: `${source}-${target}`, source, target, data: { kind } })

describe('graveyardOf', () => {
  it('a detonated problem, priced in the solutions it gated; its questions mooted', () => {
    const nodes = [strat('p1', 'problem'), strat('s1', 'solution'), strat('s2', 'solution'), strat('q1', 'question'), strat('p2', 'problem'), bet('b1', { status: 'draft' })]
    const edges = [edge('p1', 's1', 'lineage'), edge('p1', 's2', 'lineage'), edge('p1', 'q1', 'lineage'), edge('q1', 'b1', 'dependency'), edge('b1', 'p1', 'refute')]
    const g = graveyardOf(nodes, edges, NOW)
    expect(g.map((e) => [e.kind, e.id])).toEqual([['problem', 'p1'], ['question', 'q1']])
    expect(g[0]).toMatchObject({ tag: 'P1', fate: expect.stringMatching(/detonated/), cost: 'gated 2 solutions' })
    expect(g[1]).toMatchObject({ fate: 'mooted — its problem detonated', cost: 'held 1 bet at the gate' })
  })
  it('a question answered invalid is mooted', () => {
    const g = graveyardOf([strat('q1', 'question', { answered: true, validity: 'invalid' }), strat('q2', 'question', { answered: true, validity: 'valid' })], [], NOW)
    expect(g).toHaveLength(1)
    expect(g[0]).toMatchObject({ id: 'q1', fate: 'mooted — answered, answer invalid', cost: 'held nothing' })
  })
  it('lost bets are priced in days on the clock, with the default flagged when dates are missing', () => {
    const lock = new Date(NOW - 20 * DAY).toISOString(), done = new Date(NOW - 3 * DAY).toISOString()
    const g = graveyardOf([
      bet('b1', { status: 'resolved', outcome: 'loss', call: 'revert', lockedAt: lock, resolvedAt: done }),
      bet('b2', { status: 'resolved', outcome: 'loss', lockedAt: lock }),
      bet('b3', { status: 'resolved', outcome: 'loss' }),
      bet('b4', { status: 'resolved', outcome: 'win' }),
    ], [], NOW)
    expect(g.map((e) => e.cost)).toEqual(['17 days on the clock', '≈ 14 days on the clock (no resolve date)', '≈ 14 days on the clock (no lock date)'])
    expect(g[0].fate).toBe('lost — revert')
    expect(g[2].fate).toBe('lost — folded')
  })
  it('a draft pruned by an upstream loss was never run — the avoided cost', () => {
    const nodes = [bet('b1', { status: 'resolved', outcome: 'loss' }), bet('b2', { status: 'draft' }), bet('b3', { status: 'ready' })]
    const edges = [edge('b1', 'b2', 'dependency')]
    const g = graveyardOf(nodes, edges, NOW)
    expect(g.map((e) => e.id)).toEqual(['b1', 'b2'])
    expect(g[1]).toMatchObject({ fate: 'never run — pruned by B1', cost: '0 days · the avoided cost' })
  })
})
