import { describe, expect, it } from 'vitest';
import { buildArticulation, buildLockedSnapshot, buildLockedSnapshotFromBet, buildBetRecord } from '../factory';
import type { AbBet } from '../storage';
import type { Bet } from '@/lib/db/types';

const fullBet: AbBet = {
  change: 'move CTA above fold',
  direction: 'lift',
  metric: 'signup-rate',
  magnitude: '5%',
  mechanism: 'reduces scroll to action',
  confidence: 'highly',
  foldIf: 'under +2%',
};

describe('buildArticulation', () => {
  it('maps all fields from a full AbBet', () => {
    const result = buildArticulation(fullBet);
    expect(result.change).toBe('move CTA above fold');
    expect(result.direction).toBe('lift');
    expect(result.metric).toBe('signup-rate');
    expect(result.magnitude).toBe('5%');
    expect(result.mechanism).toBe('reduces scroll to action');
    expect(result.confidence).toBe('highly');
    expect(result.foldIf).toBe('under +2%');
  });

  it('defaults missing string fields to empty string', () => {
    const result = buildArticulation({});
    expect(result.change).toBe('');
    expect(result.metric).toBe('');
    expect(result.magnitude).toBe('');
    expect(result.foldIf).toBe('');
  });

  it('defaults direction to lift', () => {
    const result = buildArticulation({});
    expect(result.direction).toBe('lift');
  });

  it('defaults confidence to fairly', () => {
    const result = buildArticulation({});
    expect(result.confidence).toBe('fairly');
  });

  it('sets mechanism to null when empty or missing', () => {
    expect(buildArticulation({ mechanism: '' }).mechanism).toBeNull();
    expect(buildArticulation({}).mechanism).toBeNull();
  });
});

describe('buildLockedSnapshot', () => {
  it('includes articulation and lockedAt', () => {
    const timestamp = '2026-01-01T00:00:00Z';
    const snapshot = buildLockedSnapshot(fullBet, timestamp);
    expect(snapshot.articulation.change).toBe(fullBet.change);
    expect(snapshot.lockedAt).toBe(timestamp);
  });

  it('stubs instrument as ab type', () => {
    const snapshot = buildLockedSnapshot(fullBet, '2026-01-01T00:00:00Z');
    expect(snapshot.instrument.type).toBe('ab');
  });

  it('sets minMindChanger from foldIf', () => {
    const snapshot = buildLockedSnapshot(fullBet, '2026-01-01T00:00:00Z');
    expect(snapshot.criteria.minMindChanger).toBe(snapshot.articulation.foldIf);
  });
});

describe('buildLockedSnapshotFromBet', () => {
  it('uses the bet real instrument and criteria', () => {
    const mockBet: Bet = {
      id: 'test-id',
      cardId: null,
      ownerId: null,
      type: 'single',
      articulation: buildArticulation(fullBet),
      instrument: { type: 'quasi', overrideReason: null, feasibility: {} },
      criteria: { win: 'ship it', inconclusive: '', loss: '', minMindChanger: '', evidenceBar: '' },
      status: 'locked',
      lockedAt: '2026-01-01T00:00:00Z',
      fingerprint: 'fp',
      previousVersionId: null,
      resolution: { outcome: null, actuals: {}, integrityFlags: [], call: null, deviation: { occurred: false, reason: null }, resolvedAt: null },
      learning: { calibration: null, reflection: null },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    const snapshot = buildLockedSnapshotFromBet(mockBet, '2026-01-01T00:00:00Z');
    expect(snapshot.instrument.type).toBe('quasi');
    expect(snapshot.criteria.win).toBe('ship it');
  });
});

describe('buildBetRecord', () => {
  it('produces a locked bet with fingerprint', () => {
    const timestamp = '2026-01-01T00:00:00Z';
    const result = buildBetRecord(fullBet, timestamp, 'abc123');
    expect(result.status).toBe('locked');
    expect(result.fingerprint).toBe('abc123');
    expect(result.lockedAt).toBe(timestamp);
  });

  it('has null resolution fields', () => {
    const result = buildBetRecord(fullBet, '2026-01-01T00:00:00Z', 'abc123');
    expect(result.resolution.outcome).toBeNull();
    expect(result.resolution.call).toBeNull();
  });

  it('has an id', () => {
    const result = buildBetRecord(fullBet, '2026-01-01T00:00:00Z', 'abc123');
    expect(typeof result.id).toBe('string');
    expect(result.id.length).toBeGreaterThan(0);
  });
});
