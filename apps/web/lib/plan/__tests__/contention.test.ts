import { describe, expect, it } from 'vitest';
import { allBets, betById, findContentions } from '../contention';
import type { PlanBet, PlanEntry } from '../types';

function makeBet(overrides: Partial<PlanBet> = {}): PlanBet {
  return { id: 'b1', name: 'test', surface: 'checkout', metric: 'conversion', status: 'locked', start: 0, dur: 3, dep: null as any, ...overrides };
}

describe('allBets', () => {
  it('extracts bets from standalone entries', () => {
    const bet = makeBet({ id: 'b1' });
    const entries: PlanEntry[] = [{ type: 'solo', bet }];
    expect(allBets(entries)).toEqual([bet]);
  });

  it('extracts bets from sequence groups', () => {
    const b1 = makeBet({ id: 'b1' });
    const b2 = makeBet({ id: 'b2' });
    const entries: PlanEntry[] = [{ type: 'seq', id: 's1', name: 'seq1', chain: '', bets: [b1, b2] }];
    expect(allBets(entries)).toEqual([b1, b2]);
  });

  it('handles mix of seq and solo entries', () => {
    const b1 = makeBet({ id: 'b1' });
    const b2 = makeBet({ id: 'b2' });
    const b3 = makeBet({ id: 'b3' });
    const entries: PlanEntry[] = [
      { type: 'solo', bet: b1 },
      { type: 'seq', id: 's1', name: 'seq1', chain: '', bets: [b2, b3] }
    ];
    expect(allBets(entries)).toEqual([b1, b2, b3]);
  });

  it('returns empty array for empty input', () => {
    expect(allBets([])).toEqual([]);
  });
});

describe('betById', () => {
  it('finds a bet by id', () => {
    const bet = makeBet({ id: 'b1' });
    const entries: PlanEntry[] = [{ type: 'solo', bet }];
    expect(betById(entries, 'b1')).toBe(bet);
  });

  it('returns undefined for unknown id', () => {
    const entries: PlanEntry[] = [];
    expect(betById(entries, 'unknown')).toBeUndefined();
  });

  it('finds bet inside a sequence group', () => {
    const b1 = makeBet({ id: 'b1' });
    const b2 = makeBet({ id: 'b2' });
    const entries: PlanEntry[] = [{ type: 'seq', id: 's1', name: 'seq1', chain: '', bets: [b1, b2] }];
    expect(betById(entries, 'b2')).toBe(b2);
  });
});

describe('findContentions', () => {
  it('returns empty array when no entries share surface or metric', () => {
    const b1 = makeBet({ id: 'b1', surface: 'checkout', metric: 'conversion' });
    const b2 = makeBet({ id: 'b2', surface: 'homepage', metric: 'bounce-rate' });
    const entries: PlanEntry[] = [{ type: 'solo', bet: b1 }, { type: 'solo', bet: b2 }];
    expect(findContentions(entries)).toEqual([]);
  });

  it('detects contention when two bets share the same surface', () => {
    const b1 = makeBet({ id: 'b1', surface: 'checkout' });
    const b2 = makeBet({ id: 'b2', surface: 'checkout', metric: 'bounce-rate' });
    const entries: PlanEntry[] = [{ type: 'solo', bet: b1 }, { type: 'solo', bet: b2 }];
    const contentions = findContentions(entries);
    expect(contentions).toHaveLength(1);
    expect(contentions[0].surface).toBe('checkout');
  });

  it('detects contention when two bets share the same metric', () => {
    const b1 = makeBet({ id: 'b1', surface: 'checkout', metric: 'conversion' });
    const b2 = makeBet({ id: 'b2', surface: 'homepage', metric: 'conversion' });
    const entries: PlanEntry[] = [{ type: 'solo', bet: b1 }, { type: 'solo', bet: b2 }];
    const contentions = findContentions(entries);
    expect(contentions).toHaveLength(1);
    expect(contentions[0].surface).toBe('conversion');
  });

  it('sets overlaps=true when bets have temporal overlap', () => {
    const b1 = makeBet({ id: 'b1', start: 0, dur: 5 });
    const b2 = makeBet({ id: 'b2', surface: 'checkout', start: 3, dur: 4 });
    const entries: PlanEntry[] = [{ type: 'solo', bet: b1 }, { type: 'solo', bet: b2 }];
    const contentions = findContentions(entries);
    expect(contentions[0].overlaps).toBe(true);
  });

  it('sets overlaps=false when bets share surface but don\'t overlap in time', () => {
    const b1 = makeBet({ id: 'b1', start: 0, dur: 2 });
    const b2 = makeBet({ id: 'b2', surface: 'checkout', start: 5, dur: 3 });
    const entries: PlanEntry[] = [{ type: 'solo', bet: b1 }, { type: 'solo', bet: b2 }];
    const contentions = findContentions(entries);
    expect(contentions[0].overlaps).toBe(false);
  });

  it('does NOT detect contention when bets share neither surface nor metric', () => {
    const b1 = makeBet({ id: 'b1', surface: 'checkout', metric: 'conversion' });
    const b2 = makeBet({ id: 'b2', surface: 'homepage', metric: 'bounce-rate' });
    const entries: PlanEntry[] = [{ type: 'solo', bet: b1 }, { type: 'solo', bet: b2 }];
    expect(findContentions(entries)).toEqual([]);
  });

  it('handles multiple contentions across several bets', () => {
    const b1 = makeBet({ id: 'b1', surface: 'checkout', metric: 'conversion' });
    const b2 = makeBet({ id: 'b2', surface: 'checkout', metric: 'bounce-rate' });
    const b3 = makeBet({ id: 'b3', surface: 'homepage', metric: 'bounce-rate' });
    const entries: PlanEntry[] = [{ type: 'solo', bet: b1 }, { type: 'solo', bet: b2 }, { type: 'solo', bet: b3 }];
    const contentions = findContentions(entries);
    expect(contentions).toHaveLength(2);
  });
});
