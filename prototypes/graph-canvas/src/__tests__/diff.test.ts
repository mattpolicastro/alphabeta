import { describe, expect, it } from 'vitest'
import type { BetRecord } from '../model'
import { TEXT_WIDTH, amendedRow, diffRows, diffText, wrap } from '../diff-rows'

const locked: BetRecord = {
  change: 'testing a high-contrast CTA color on the pricing page', direction: 'lift', metric: 'pricing page → checkout-start rate', magnitude: '5%',
  mechanism: 'draws attention', foldIf: '+2pp checkout-start', confidence: '0.55', surface: 'pricing', status: 'locked', outcome: null,
  instrument: { type: 'ab', spec: '50/50 by visitor · 14 days' }, lockedAt: '2026-08-20T00:00:00.000Z',
  criteria: { win: 'Keep — roll out.', inconclusive: 'Hold — re-test.', loss: 'Revert.' },
}
const resolved: BetRecord = { ...locked, status: 'resolved', outcome: 'loss', actuals: '+0.4pp', call: 'keep', deviation: 'sales loved it — shipping anyway' }

describe('diffRows', () => {
  it('in flight: every committed row is pending on the right', () => {
    const rows = diffRows(locked)
    expect(rows.map((r) => r.label)).toEqual(['wager', 'fold-if', 'win', 'incon.', 'loss', 'confidence', 'rung'])
    expect(rows.every((r) => r.mark === 'pending')).toBe(true)
    expect(rows[0].planned).toBe('Betting that testing a high-contrast CTA color on the pricing page will lift pricing page → checkout-start rate by 5%.')
  })
  it('resolved with a deviation: the fired bucket and the fold-if read deviated, the rest held', () => {
    const rows = diffRows(resolved)
    const by = Object.fromEntries(rows.map((r) => [r.label, r]))
    expect(by['fold-if']).toMatchObject({ reported: 'loss → keep', mark: 'deviated' })
    expect(by.loss).toMatchObject({ reported: 'fired → keep', mark: 'deviated' })
    expect(by.win).toMatchObject({ reported: 'did not fire', mark: 'held' })
    expect(by.wager).toMatchObject({ reported: '+0.4pp', mark: 'held' })
    expect(by.confidence).toMatchObject({ planned: '0.55', reported: '0 (loss)', mark: 'held' })
    expect(by.deviation).toMatchObject({ reported: 'sales loved it — shipping anyway', mark: 'deviated' })
  })
  it('amendments mark their row and are listed in order', () => {
    const b: BetRecord = { ...locked, amendments: [
      { ts: '2026-08-29T09:00:00.000Z', field: 'runtime', change: '14d → 21d', reason: 'volume low' },
      { ts: '2026-08-30T09:00:00.000Z', field: 'fold-if', change: '+2pp → +1.5pp', reason: 'baseline moved' },
    ] }
    const rows = diffRows(b)
    expect(rows.find((r) => r.label === 'rung')).toMatchObject({ reported: '14d → 21d', mark: 'amended' })
    expect(rows.find((r) => r.label === 'fold-if')).toMatchObject({ reported: '+2pp → +1.5pp', mark: 'amended' })
    expect(rows.slice(-2).map((r) => r.label)).toEqual(['amend · 2026-08-29', 'amend · 2026-08-30'])
    expect(rows[rows.length - 1].reported).toBe('+2pp → +1.5pp — “baseline moved”')
    expect(amendedRow('sample size')).toBe('rung')
    expect(amendedRow('owner')).toBeNull()
  })
})

describe('diffText', () => {
  it('never exceeds 80 columns and carries both columns', () => {
    for (const b of [locked, resolved]) {
      const t = diffText(b, 'B3')
      for (const line of t.split('\n')) expect(line.length).toBeLessThanOrEqual(TEXT_WIDTH)
      expect(t).toMatch(/as planned\s+as reported/)
      expect(t).toContain('B3 · testing a high-contrast')
    }
    expect(TEXT_WIDTH).toBe(80)
  })
  it('wraps words, hard-splits tokens wider than the column', () => {
    expect(wrap('one two three', 7)).toEqual(['one two', 'three'])
    expect(wrap('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij'])
    expect(wrap('', 4)).toEqual([''])
  })
})
