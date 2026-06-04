import { describe, expect, it, beforeEach } from 'vitest';
import { stashElevationDump, takeElevationDump } from '../elevationDump';

beforeEach(() => {
  window.localStorage.clear();
});

describe('stashElevationDump', () => {
  it('stores text under the bet-scoped key', () => {
    stashElevationDump('bet-1', 'hello world');
    expect(window.localStorage.getItem('ab_elevation_dump:bet-1')).toBe('hello world');
  });

  it('does not collide across bet ids', () => {
    stashElevationDump('bet-1', 'text for bet-1');
    stashElevationDump('bet-2', 'text for bet-2');
    expect(window.localStorage.getItem('ab_elevation_dump:bet-1')).toBe('text for bet-1');
    expect(window.localStorage.getItem('ab_elevation_dump:bet-2')).toBe('text for bet-2');
  });
});

describe('takeElevationDump', () => {
  it('returns the stashed text', () => {
    stashElevationDump('bet-1', 'some text');
    expect(takeElevationDump('bet-1')).toBe('some text');
  });

  it('removes the item after reading (one-shot)', () => {
    stashElevationDump('bet-1', 'some text');
    expect(takeElevationDump('bet-1')).toBe('some text');
    expect(takeElevationDump('bet-1')).toBeNull();
  });

  it('returns null when nothing was stashed', () => {
    expect(takeElevationDump('nonexistent')).toBeNull();
  });
});
