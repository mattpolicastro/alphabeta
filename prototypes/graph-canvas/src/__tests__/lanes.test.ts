import { describe, expect, it } from 'vitest'
import {
  BET_GEN, BET_GENX, BET_X0, BET_Y0, LANE_X, LANE_Y,
  betGenerations, laneBands,
} from '../lanes'

const keys = (o: 'v' | 'h', g: number) => laneBands(o, g).map((b) => b.key)
const labels = (o: 'v' | 'h', g: number) => laneBands(o, g).map((b) => b.label)

describe('laneBands', () => {
  it('names the lanes the grammar names', () => {
    expect(labels('v', 1)).toEqual(['goals', 'problems', 'questions · solutions', 'bets'])
    expect(labels('h', 1)).toEqual(['goals', 'problems', 'questions · solutions', 'bets'])
  })

  it('adds one band per bet generation, in both orientations', () => {
    for (const o of ['v', 'h'] as const) {
      expect(keys(o, 1)).toEqual(['goal', 'problem', 'child', 'bet-0'])
      expect(keys(o, 2)).toEqual(['goal', 'problem', 'child', 'bet-0', 'bet-1'])
      expect(keys(o, 3)).toEqual(['goal', 'problem', 'child', 'bet-0', 'bet-1', 'bet-2'])
      expect(labels(o, 3).slice(3)).toEqual(['bets', 'bets · gen 2', 'bets · gen 3'])
    }
  })

  it('never returns fewer than one bet lane', () => {
    expect(keys('v', 0)).toEqual(['goal', 'problem', 'child', 'bet-0'])
    expect(keys('h', -2)).toEqual(['goal', 'problem', 'child', 'bet-0'])
  })

  it('tiles the axis: bands are ordered, non-empty and gapless', () => {
    for (const o of ['v', 'h'] as const)
      for (const g of [1, 2, 3]) {
        const bands = laneBands(o, g)
        for (const b of bands) expect(b.end).toBeGreaterThan(b.start)
        for (let i = 1; i < bands.length; i++) expect(bands[i].start).toBe(bands[i - 1].end)
      }
  })

  it('vertical bands follow the y lanes the layout places nodes on', () => {
    for (const g of [1, 2, 3]) {
      const bands = laneBands('v', g)
      const at = (k: string) => bands.find((b) => b.key === k)!
      const holds = (k: string, coord: number) => {
        const b = at(k)
        expect(coord).toBeGreaterThanOrEqual(b.start)
        expect(coord).toBeLessThan(b.end)
      }
      holds('goal', LANE_Y.goal)
      holds('problem', LANE_Y.problem)
      holds('child', LANE_Y.child)
      for (let i = 0; i < g; i++) holds(`bet-${i}`, BET_Y0 + BET_GEN * i)
      // boundaries fall midway between adjacent lanes
      expect(at('problem').start).toBe((LANE_Y.goal + LANE_Y.problem) / 2)
      expect(at('bet-0').start).toBe((LANE_Y.child + BET_Y0) / 2)
    }
  })

  it('horizontal bands follow the x lanes instead', () => {
    for (const g of [1, 2, 3]) {
      const bands = laneBands('h', g)
      const at = (k: string) => bands.find((b) => b.key === k)!
      const holds = (k: string, coord: number) => {
        const b = at(k)
        expect(coord).toBeGreaterThanOrEqual(b.start)
        expect(coord).toBeLessThan(b.end)
      }
      holds('goal', LANE_X.goal)
      holds('problem', LANE_X.problem)
      holds('child', LANE_X.child)
      for (let i = 0; i < g; i++) holds(`bet-${i}`, BET_X0 + BET_GENX * i)
      expect(at('problem').start).toBe((LANE_X.goal + LANE_X.problem) / 2)
    }
  })

  it('the two orientations are different geometry, same lanes', () => {
    const v = laneBands('v', 2)
    const h = laneBands('h', 2)
    expect(v.map((b) => b.key)).toEqual(h.map((b) => b.key))
    expect(v.map((b) => b.start)).not.toEqual(h.map((b) => b.start))
  })
})

describe('betGenerations', () => {
  it('reads the cascade depth off the cards, clamped to at least one lane', () => {
    expect(betGenerations([], 'v')).toBe(1)
    expect(betGenerations([{ x: 0, y: BET_Y0 }], 'v')).toBe(1)
    expect(betGenerations([{ x: 0, y: BET_Y0 + BET_GEN }], 'v')).toBe(2)
    expect(betGenerations([{ x: 0, y: BET_Y0 }, { x: 0, y: BET_Y0 + BET_GEN * 2 }], 'v')).toBe(3)
    expect(betGenerations([{ x: BET_X0 + BET_GENX, y: 0 }], 'h')).toBe(2)
    // a dragged card between lanes rounds to its nearest generation
    expect(betGenerations([{ x: 0, y: BET_Y0 + BET_GEN * 1.2 }], 'v')).toBe(2)
  })
})
