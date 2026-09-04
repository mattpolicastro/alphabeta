import { describe, expect, it } from 'vitest'
import type { Edge, Node } from '@xyflow/react'
import type { BetRecord, StratRecord } from '../model'
import { DAY } from '../contentions'
import { dueItems, tagOf } from '../docket-items'

const NOW = Date.parse('2026-09-04T12:00:00Z')
const day = (d: number) => new Date(NOW + d * DAY).toISOString()

const bet = (id: string, seq: number, b: Partial<BetRecord>): Node => ({
  id, type: 'bet', position: { x: 0, y: 0 },
  data: { seq, bet: { change: id, direction: 'lift', metric: 'm', magnitude: '1%', mechanism: '', foldIf: '+1pp', surface: 'pricing', status: 'locked', outcome: null, criteria: { win: '', inconclusive: '', loss: '' }, ...b } },
})
const q = (id: string, seq: number, s: Partial<StratRecord>): Node => ({
  id, type: 'strat', position: { x: 0, y: 0 }, data: { seq, strat: { kind: 'question', title: id, ...s } },
})
const dep = (source: string, target: string): Edge => ({ id: `${source}-${target}`, source, target, data: { kind: 'dependency' } })

describe('dueItems — maturation', () => {
  it('a bet past its maturation is overdue, action resolve, most overdue first', () => {
    const items = dueItems([bet('a', 1, { lockedAt: day(-20), surface: 'a' }), bet('b', 2, { lockedAt: day(-30), surface: 'b' })], [], NOW)
    expect(items.map((i) => [i.nodeId, i.urgency, i.action])).toEqual([['b', 'overdue', 'resolve'], ['a', 'overdue', 'resolve']])
    expect(items[1].reason).toMatch(/^matured 6 days ago \(14d default\)/)
    expect(items[1].due).toBe(day(-6))
  })
  it('a bet exactly 7 days out is this week; 8 days is later', () => {
    const seven = dueItems([bet('a', 1, { lockedAt: day(-7) })], [], NOW)[0]
    expect(seven).toMatchObject({ urgency: 'this-week', action: 'resolve', due: day(7) })
    expect(seven.reason).toMatch(/in 7 days/)
    expect(dueItems([bet('a', 1, { lockedAt: day(-6) })], [], NOW)[0].urgency).toBe('later')
  })
  it('reads the declared maturation and says where the number came from', () => {
    const it2 = dueItems([bet('a', 1, { status: 'running', lockedAt: day(-18), expectedResolveBy: day(3) })], [], NOW)[0]
    expect(it2).toMatchObject({ urgency: 'this-week', due: day(3) })
    expect(it2.reason).toContain('21d declared at lock')
  })
  it('a live bet with no lock date is anchored at now and says so', () => {
    const it2 = dueItems([bet('a', 1, {})], [], NOW)[0]
    expect(it2).toMatchObject({ urgency: 'later', due: day(14) })
    expect(it2.reason).toContain('no lock date')
  })
  it('resolved and draft bets are not owed', () => {
    expect(dueItems([bet('a', 1, { status: 'resolved', outcome: 'win', lockedAt: day(-30) }), bet('b', 2, { status: 'draft' })], [], NOW)).toEqual([])
  })
})

describe('dueItems — gates and launches', () => {
  it('a gated draft waits on its blockers, action unblock, blockedBy set', () => {
    const ns = [bet('b6', 6, { status: 'running', surface: 'x' }), bet('b5', 5, { status: 'locked', surface: 'y' }), bet('b2', 2, { status: 'draft' })]
    const items = dueItems(ns, [dep('b6', 'b2'), dep('b5', 'b2')], NOW)
    const g = items.find((i) => i.nodeId === 'b2')!
    expect(g).toMatchObject({ urgency: 'gated', action: 'unblock', blockedBy: ['b6', 'b5'] })
    expect(g.reason).toBe('waits on B6 AND B5 (loss would prune)')
  })
  it('a ready bet whose gate is open is later / lock; a pruned one is not owed', () => {
    const won = bet('w', 1, { status: 'resolved', outcome: 'win' }), lost = bet('l', 2, { status: 'resolved', outcome: 'loss' })
    const open = dueItems([won, bet('r', 3, { status: 'ready' })], [dep('w', 'r')], NOW)
    expect(open).toHaveLength(1)
    expect(open[0]).toMatchObject({ nodeId: 'r', urgency: 'later', action: 'lock' })
    expect(dueItems([lost, bet('r', 3, { status: 'ready' })], [dep('l', 'r')], NOW)).toEqual([])
  })
})

describe('dueItems — contentions and questions', () => {
  it('two live bets on one surface → a this-week revisit naming both', () => {
    const items = dueItems([bet('a', 1, { lockedAt: day(-3) }), bet('b', 2, { lockedAt: day(-1), status: 'running' })], [], NOW)
    const c = items.find((i) => i.kind === 'contention')!
    expect(c).toMatchObject({ urgency: 'this-week', action: 'revisit', nodeId: 'a', id: 'contention:a:b' })
    expect(c.reason).toMatch(/^B1 × B2 both read pricing — overlap 09-03 → 09-15, 12d/)
  })
  it('an owned open question is off the clock, aged from createdAt', () => {
    const items = dueItems([q('q1', 1, { owner: 'Priya', createdAt: day(-21) })], [], NOW)
    expect(items[0]).toMatchObject({ urgency: 'off-clock', action: 'answer', ageDays: 21 })
    expect(items[0].reason).toBe('owned by Priya, open 21 days · expectation not yet stated')
  })
  it('an ownerless, expectation-less question is excluded; an answered one too', () => {
    expect(dueItems([q('q1', 1, { createdAt: day(-40) }), q('q2', 2, { owner: 'Sam', answered: true })], [], NOW)).toEqual([])
  })
  it('an expectation without an owner still counts; no createdAt → age unknown', () => {
    const items = dueItems([q('q1', 1, { expectation: 'most do' })], [], NOW)
    expect(items[0].ageDays).toBeUndefined()
    expect(items[0].reason).toBe('expectation stated, unowned, age unknown')
  })
})

describe('dueItems — order', () => {
  it('overdue, this week (by due), later (by due), gated, off the clock (oldest first)', () => {
    const ns = [
      q('q-young', 1, { owner: 'a', createdAt: day(-3) }),
      q('q-old', 2, { owner: 'b', createdAt: day(-21) }),
      bet('gated', 1, { status: 'draft' }),
      bet('later', 2, { lockedAt: day(-2), surface: 's1' }),
      bet('week', 3, { lockedAt: day(-10), surface: 's2' }),
      bet('overdue', 4, { lockedAt: day(-20), surface: 's3' }),
      bet('ready', 5, { status: 'ready' }),
      bet('blocker', 6, { status: 'running', surface: 's4' }),
    ]
    const items = dueItems(ns, [dep('blocker', 'gated')], NOW)
    expect(items.map((i) => i.nodeId)).toEqual(['overdue', 'week', 'later', 'blocker', 'ready', 'gated', 'q-old', 'q-young'])
  })
  it('tagOf reads the per-kind sequence tag and dots a missing one', () => {
    expect(tagOf(bet('a', 3, {}))).toBe('B3')
    expect(tagOf(q('q', 2, {}))).toBe('Q2')
    expect(tagOf({ id: 'x', type: 'bet', position: { x: 0, y: 0 }, data: {} })).toBe('B·')
  })
})
