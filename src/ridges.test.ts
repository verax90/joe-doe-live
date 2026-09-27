import { describe, expect, it } from 'vitest';
import { ridgeFrequency, ridgeRow, ridgeWindow } from './ridges';

describe('Lines visual', () => {
  it('raises mountains in the middle only', () => {
    expect(ridgeWindow(0.5)).toBe(1);
    expect(ridgeWindow(0.1)).toBeLessThan(0.01);
    expect(ridgeWindow(0.9)).toBeLessThan(0.01);
  });
  it('spreads 60 Hz to 8 kHz across the middle half', () => {
    expect(ridgeFrequency(0.25)).toBeCloseTo(60);
    expect(ridgeFrequency(0.75)).toBeCloseTo(8000);
    expect(ridgeFrequency(0)).toBeCloseTo(60);
    expect(ridgeFrequency(1)).toBeCloseTo(8000);
  });
  it('breathes a little in silence and rises with sound', () => {
    const quiet = ridgeRow(undefined, 48000, 0, 0, 11);
    expect(Math.max(...quiet)).toBeLessThanOrEqual(0.12);
    const loud = ridgeRow(new Float32Array(1024).fill(-25), 48000, 0, 0, 11);
    expect(loud[5]).toBeGreaterThan(0.9); // the middle, full volume
    expect(loud[0]).toBeLessThan(0.01); // the edge stays flat
  });
});

describe('Tools panel', () => {
  it('leaves out the links the studio does itself', async () => {
    const { notBuiltIn } = await import('./tools');
    expect(notBuiltIn({ url: 'https://labs.fluuu.id/lines/' })).toBe(false);
    expect(notBuiltIn({ url: 'https://cwilso.github.io/Audio-Input-Effects/' })).toBe(false);
    expect(notBuiltIn({ url: 'https://strudel.cc/' })).toBe(true);
  });
});
