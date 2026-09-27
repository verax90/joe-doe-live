import { describe, expect, it } from 'vitest';
import { noteName, quantize, riffCode, toMini } from './riff';

describe('riff', () => {
  it('names notes as Strudel does', () => {
    expect(noteName(60)).toBe('c4');
    expect(noteName(48)).toBe('c3');
    expect(noteName(63)).toBe('d#4');
  });

  it('puts hits on the grid, a chord together, a hair early onto the beat', () => {
    const grid = quantize(
      [
        { cycle: -0.02, token: 'c3' }, // just before the downbeat
        { cycle: 0.26, token: 'e3' },
        { cycle: 0.25, token: 'g3' },
        { cycle: 0.99, token: 'x' }, // rounds past the last step: dropped
      ],
      1,
      8,
    );
    expect(toMini(grid)).toBe('c3 ~ [e3,g3] ~ ~ ~ ~ ~');
  });

  it('writes one bracket per bar, keys and pads apart', () => {
    const lines = riffCode(
      [
        { cycle: 0, token: 'c3', pad: false },
        { cycle: 1.5, token: 'eb3', pad: false },
        { cycle: 0, token: 'bd', pad: true },
        { cycle: 1.25, token: 'mpc_celestial:3', pad: true },
      ],
      2,
      4,
      'piano',
    );
    expect(lines).toEqual(['note("<[c3 ~ ~ ~] [~ ~ eb3 ~]>").s("piano")', 's("<[bd ~ ~ ~] [~ mpc_celestial:3 ~ ~]>")']);
    expect(riffCode([], 1, 8, 'piano')).toEqual([]);
  });
});
