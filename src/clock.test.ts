import { describe, expect, it } from 'vitest';
import { clockBpm } from './midi';

describe('tempo from a MIDI clock', () => {
  const ticks = (bpm: number, count: number) => Array.from({ length: count }, (_, i) => (i * 60000) / bpm / 24);

  it('needs a whole beat', () => {
    expect(clockBpm(ticks(120, 24))).toBeNull();
    expect(clockBpm(ticks(120, 25))).toBe(120);
  });

  it('reads tenths', () => {
    expect(clockBpm(ticks(93.5, 97))).toBe(93.5);
  });

  it('a little jitter does not move it', () => {
    const shaky = ticks(120, 97).map((at, i) => at + (i % 2 ? 0.4 : -0.4));
    expect(clockBpm(shaky)).toBeCloseTo(120, 0);
  });
});
