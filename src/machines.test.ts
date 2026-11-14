import { describe, expect, it } from 'vitest';
import { autoGainStep, createDrumSorter, createOnset, gainOf, ROLE_BANDS } from './machines';

describe('hits heard on an audio input', () => {
  const feed = (onset: ReturnType<typeof createOnset>, levels: number[], stepMs = 16) =>
    levels.map((level, i) => onset(level, i * stepMs));

  it('a jump over the recent level is a hit, once', () => {
    const hits = feed(createOnset(), [0.3, 0.3, 0.3, 0.3, 0.7, 0.75, 0.6, 0.4, 0.3]);
    expect(hits.filter(Boolean)).toHaveLength(1);
    expect(hits[4]).toBe(true);
  });

  it('a steady loud sound is not a hit', () => {
    const hits = feed(createOnset(), Array(60).fill(0.8));
    expect(hits.some(Boolean)).toBe(false);
  });

  it('nothing under the floor counts, however it jumps', () => {
    expect(feed(createOnset(), [0, 0, 0, 0.15, 0.2, 0.1]).some(Boolean)).toBe(false);
  });

  it('four on the floor gives four hits', () => {
    // 120 BPM at 16 ms a frame: a kick every 31 frames, decaying
    const levels = Array.from({ length: 31 * 4 }, (_, i) => 0.3 + 0.5 * Math.exp(-(i % 31) / 5));
    // the first frame has no "before" to jump from
    expect(feed(createOnset(), [0.3, 0.3, ...levels]).filter(Boolean)).toHaveLength(4);
  });

  it('the bands of the three drums do not overlap', () => {
    expect(ROLE_BANDS.kick[1]).toBeLessThan(ROLE_BANDS.snare[0]);
    expect(ROLE_BANDS.snare[1]).toBeLessThan(ROLE_BANDS.hat[0]);
  });

  it('the middle of Sensitivity leaves the input as it is', () => {
    expect(gainOf(0.5)).toBe(1);
    expect(gainOf(1)).toBeGreaterThan(5);
    expect(gainOf(0)).toBeLessThan(0.2);
  });

  const none = { kick: false, snare: false, hat: false };
  const both = { kick: true, snare: true, hat: false };

  it('a hit waits a moment and is a kick when the low end is what rings on', () => {
    const sort = createDrumSorter(34);
    // the crack: lows and mids alike
    expect(sort(both, { kick: 0.8, snare: 0.55, hat: 0 }, 0)).toEqual([]);
    expect(sort(none, { kick: 0.82, snare: 0.5, hat: 0 }, 16)).toEqual([]);
    expect(sort(none, { kick: 0.78, snare: 0.24, hat: 0 }, 34)).toEqual(['kick']);
    expect(sort(none, { kick: 0.8, snare: 0.1, hat: 0 }, 50)).toEqual([]);
  });

  it('and a snare when the lows are gone and the rattle goes on', () => {
    const sort = createDrumSorter(34);
    expect(sort(both, { kick: 0.8, snare: 0.56, hat: 0 }, 0)).toEqual([]);
    expect(sort(none, { kick: 0.54, snare: 0.56, hat: 0 }, 34)).toEqual(['snare']);
  });

  it('hats do not wait, and one hit is one drum', () => {
    const sort = createDrumSorter(34);
    expect(sort({ ...both, hat: true }, { kick: 0.8, snare: 0.5, hat: 0.6 }, 0)).toEqual(['hat']);
    // the snare band's own onset a frame later belongs to the same hit
    expect(sort({ ...none, snare: true }, { kick: 0.8, snare: 0.5, hat: 0 }, 16)).toEqual([]);
    expect(sort(none, { kick: 0.8, snare: 0.2, hat: 0 }, 34)).toEqual(['kick']);
    expect(sort({ ...none, snare: true }, { kick: 0.7, snare: 0.3, hat: 0 }, 50)).toEqual([]);
    expect(sort(none, { kick: 0.6, snare: 0.1, hat: 0 }, 100)).toEqual([]);
  });

  it('the sensitivity sets itself: up when quiet, down when pinned, still in silence', () => {
    expect(autoGainStep(0.5, 0.3)).toBeCloseTo(0.56);
    expect(autoGainStep(0.5, 0.5)).toBeCloseTo(0.52);
    expect(autoGainStep(0.5, 0.98)).toBeCloseTo(0.48);
    expect(autoGainStep(0.5, 0.8)).toBe(0.5);
    expect(autoGainStep(0.5, 0.01)).toBe(0.5); // nothing plugged in
    expect(autoGainStep(1, 0.3)).toBe(1);
  });
});
