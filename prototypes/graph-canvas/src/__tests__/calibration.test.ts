import { describe, expect, it } from 'vitest'
import type { Node } from '@xyflow/react'
import { brier, calibrationBins, calibrationPoints, calibrationRead, parseConfidence } from '../calibration-score'

const bet = (id: string, b: Record<string, unknown>): Node => ({
  id, type: 'bet', position: { x: 0, y: 0 },
  data: { seq: Number(id.slice(1)), bet: { change: id, direction: 'lift', metric: 'm', magnitude: '1%', mechanism: '', foldIf: '+1pp', surface: '', status: 'resolved', criteria: { win: '', inconclusive: '', loss: '' }, ...b } },
})

describe('parseConfidence', () => {
  it('reads proportions and percents', () => {
    expect(parseConfidence('0.55')).toBe(0.55)
    expect(parseConfidence('55%')).toBe(0.55)
    expect(parseConfidence('55')).toBe(0.55)
    expect(parseConfidence('1')).toBe(1)
    expect(parseConfidence('about even')).toBeNull()
    expect(parseConfidence(undefined)).toBeNull()
    expect(parseConfidence('150')).toBeNull()
  })
})

describe('calibrationPoints + scoring', () => {
  const nodes = [
    bet('b1', { outcome: 'win', confidence: '0.8' }),
    bet('b2', { outcome: 'loss', confidence: '0.6' }),
    bet('b3', { outcome: 'inconclusive', confidence: '0.5' }),
    bet('b4', { outcome: 'win' }), // no confidence → not a point
    bet('b5', { outcome: 'invalid', confidence: '0.9' }), // invalid → not a point
    bet('b6', { status: 'locked', outcome: null, confidence: '0.7' }),
  ]
  it('takes resolved bets with a numeric confidence; win = 1, everything else 0', () => {
    const p = calibrationPoints(nodes)
    expect(p.map((x) => [x.tag, x.confidence, x.outcome])).toEqual([['B1', 0.8, 1], ['B2', 0.6, 0], ['B3', 0.5, 0]])
  })
  it('brier is the mean squared gap', () => {
    const p = calibrationPoints(nodes)
    expect(brier(p)).toBeCloseTo((0.04 + 0.36 + 0.25) / 3, 10)
    expect(brier([])).toBeNull()
  })
  it('bins by confidence', () => {
    const bins = calibrationBins(calibrationPoints(nodes))
    expect(bins.map((b) => b.n)).toEqual([0, 0, 1, 1, 1])
    expect(bins[2]).toMatchObject({ lo: 0.4, hi: 0.6, winRate: 0, meanConfidence: 0.5 })
    expect(bins[3]).toMatchObject({ lo: 0.6, hi: 0.8, winRate: 0, meanConfidence: 0.6 })
    expect(bins[4]).toMatchObject({ winRate: 1, meanConfidence: 0.8 })
  })
  it('the read refuses below n=10 and characterises above it', () => {
    expect(calibrationRead([])).toMatch(/^n=0/)
    expect(calibrationRead(calibrationPoints(nodes))).toBe('n=3 — too few to say')
    const many = Array.from({ length: 12 }, (_, i) => bet(`b${i}`, { outcome: i < 4 ? 'win' : 'loss', confidence: '0.7' }))
    expect(calibrationRead(calibrationPoints(many))).toBe('n=12 · Brier 0.36 · said 70% on average, won 33% — overconfident by 37 pts')
    const fine = Array.from({ length: 10 }, (_, i) => bet(`b${i}`, { outcome: i < 5 ? 'win' : 'loss', confidence: '0.5' }))
    expect(calibrationRead(calibrationPoints(fine))).toMatch(/calibrated, so far$/)
  })
})
