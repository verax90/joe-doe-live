import { describe, expect, it } from 'vitest';
import { hitAfter, kickCount, kickHit, markHit, snareHit } from './hits';

describe('drum hits as pulses', () => {
  it('is 1 on the hit and fades', () => {
    expect(hitAfter(0, 200)).toBe(1);
    expect(hitAfter(200, 200)).toBeCloseTo(1 / Math.E);
    expect(hitAfter(-5, 200)).toBe(0); // not yet
  });

  it('a kick now lights kickHit() and counts, and leaves the snare alone', () => {
    const before = kickCount();
    markHit('kick');
    expect(kickHit()).toBeGreaterThan(0.9);
    expect(kickCount()).toBe(before + 1);
    expect(snareHit()).toBe(0);
  });
});
