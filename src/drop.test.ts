import { describe, expect, it } from 'vitest';
import { rollHits } from './drop';

describe('build-up', () => {
  it('speeds the roll up in four stages over four bars', () => {
    const hits = rollHits(4, 2, false);
    // 4 + 8 + 16 + 32 hits, the first on the build's start
    expect(hits).toHaveLength(60);
    expect(hits[0]).toEqual({ at: 0, gain: 0.25 });
    const perBar = [0, 1, 2, 3].map((bar) => hits.filter((h) => h.at >= bar * 2 && h.at < (bar + 1) * 2).length);
    expect(perBar).toEqual([4, 8, 16, 32]);
    // louder and louder
    expect(hits.every((h, i) => i === 0 || h.gain > hits[i - 1].gain)).toBe(true);
  });

  it('leaves the last half beat empty for the silence before the drop', () => {
    const hits = rollHits(2, 2, true);
    const last = hits.at(-1)!.at;
    expect(last).toBeLessThan(4 - 0.25);
    expect(rollHits(2, 2, false).at(-1)!.at).toBeGreaterThan(4 - 0.25);
  });

  it('takes eight bars two by two', () => {
    const perBar = Array.from({ length: 8 }, (_, bar) => rollHits(8, 1, false).filter((h) => h.at >= bar && h.at < bar + 1).length);
    expect(perBar).toEqual([4, 4, 8, 8, 16, 16, 32, 32]);
  });
});
