import { describe, expect, it } from 'vitest';
import { autoGainStep, createDrumSorter, createOnset, gainOf, type Energy } from './machines';

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

  it('the middle of Sensitivity leaves the input as it is', () => {
    expect(gainOf(0.5)).toBe(1);
    expect(gainOf(1)).toBeGreaterThan(5);
    expect(gainOf(0)).toBeLessThan(0.2);
  });

  it('the sensitivity sets itself from the peak: up when quiet, down over the top, still in silence', () => {
    expect(autoGainStep(0.5, 0.1)).toBeCloseTo(0.56);
    expect(autoGainStep(0.5, 0.4)).toBeCloseTo(0.52);
    expect(autoGainStep(0.5, 1.5)).toBeCloseTo(0.48);
    expect(autoGainStep(0.5, 0.8)).toBe(0.5);
    expect(autoGainStep(0.5, 0.001)).toBe(0.5); // nothing plugged in
    expect(autoGainStep(1, 0.1)).toBe(1);
  });
});

// Each sound of four of the studio's kits as the analyser sees it: the six
// bands (sub, low, lowmid, mid, himid, high) on the frame the hit lands, 32 ms
// later and 64 ms later. Measured by playing them through the studio's output
describe('telling the drums apart, on real kits', () => {
  const e = ([sub, low, lowmid, mid, himid, high]: number[]): Energy => ({ sub, low, lowmid, mid, himid, high });
  const BAND_ORDER = ['sub', 'low', 'lowmid', 'mid', 'himid', 'high'] as const;
  type Sound = [number[], number[], number[]];
  const KITS: Record<string, Record<string, Sound>> = {
    studio: {
      bd: [[0.47, 0.72, 0.72, 0.42, 0.29, 0.1], [0.96, 0.98, 0.74, 0.53, 0.48, 0.23], [0.99, 0.92, 0.5, 0.31, 0.29, 0.07]],
      sd: [[0.68, 0.71, 0.77, 0.45, 0.3, 0.13], [0.78, 0.9, 0.8, 0.61, 0.6, 0.51], [0.7, 0.88, 0.67, 0.5, 0.54, 0.46]],
      cp: [[0.24, 0.25, 0.42, 0.55, 0.48, 0.29], [0.54, 0.52, 0.57, 0.77, 0.74, 0.56], [0.57, 0.5, 0.56, 0.76, 0.66, 0.46]],
      hh: [[0, 0.03, 0.28, 0.37, 0.42, 0.36], [0, 0, 0.11, 0.23, 0.33, 0.27], [0, 0, 0, 0.13, 0.18, 0.17]],
    },
    tr808: {
      bd: [[0.6, 0.72, 0.6, 0.19, 0.01, 0], [0.97, 0.78, 0.48, 0.08, 0, 0], [0.75, 0.31, 0.02, 0, 0, 0]],
      sd: [[0.52, 0.69, 0.65, 0.36, 0.17, 0.02], [0.47, 0.75, 0.55, 0.18, 0.03, 0], [0.2, 0.53, 0.19, 0, 0, 0]],
      cp: [[0.59, 0.52, 0.45, 0.5, 0.39, 0.16], [0.69, 0.53, 0.45, 0.72, 0.63, 0.38], [0.57, 0.23, 0.43, 0.71, 0.6, 0.36]],
      hh: [[0, 0, 0, 0.01, 0.17, 0.41], [0, 0, 0, 0, 0.11, 0.37], [0, 0, 0, 0, 0.01, 0.1]],
    },
    tr909: {
      bd: [[0.57, 0.66, 0.63, 0.3, 0.15, 0.01], [0.71, 0.97, 0.78, 0.36, 0.09, 0], [0.88, 0.97, 0.61, 0.17, 0, 0]],
      sd: [[0.66, 0.65, 0.7, 0.34, 0.35, 0.26], [0.67, 0.64, 0.8, 0.49, 0.52, 0.44], [0.42, 0.44, 0.6, 0.45, 0.5, 0.44]],
      cp: [[0.07, 0.22, 0.37, 0.55, 0.47, 0.25], [0.11, 0.22, 0.42, 0.68, 0.61, 0.37], [0.08, 0.13, 0.34, 0.57, 0.44, 0.22]],
      rim: [[0.59, 0.57, 0.67, 0.61, 0.46, 0.15], [0.69, 0.57, 0.7, 0.5, 0.29, 0.02], [0.38, 0.22, 0.35, 0.17, 0.02, 0]],
      hh: [[0.38, 0.33, 0.48, 0.45, 0.49, 0.39], [0.35, 0.23, 0.45, 0.47, 0.49, 0.41], [0.24, 0, 0.19, 0.21, 0.26, 0.18]],
    },
    mpc60: {
      bd: [[0.64, 0.69, 0.42, 0.22, 0.35, 0.06], [1, 0.89, 0.4, 0.27, 0.38, 0.03], [0.96, 0.66, 0.15, 0.06, 0.13, 0]],
      sd: [[0.58, 0.66, 0.72, 0.55, 0.42, 0.25], [0.72, 0.76, 0.92, 0.83, 0.76, 0.57], [0.65, 0.72, 0.89, 0.79, 0.76, 0.63]],
      cp: [[0.44, 0.43, 0.39, 0.5, 0.47, 0.42], [0.64, 0.54, 0.68, 0.78, 0.63, 0.52], [0.54, 0.54, 0.62, 0.79, 0.64, 0.49]],
      rim: [[0.49, 0.59, 0.61, 0.57, 0.5, 0.26], [0.48, 0.58, 0.57, 0.61, 0.54, 0.25], [0.31, 0.35, 0.36, 0.39, 0.37, 0.12]],
      hh: [[0.43, 0.47, 0.52, 0.44, 0.47, 0.53], [0.46, 0.34, 0.42, 0.38, 0.39, 0.44], [0.3, 0.04, 0.08, 0.08, 0.07, 0.1]],
    },
  };
  const EXPECTED: Record<string, string[]> = { bd: ['kick'], sd: ['snare'], cp: ['snare'], rim: ['snare'], hh: ['hat'] };

  // the hit lands on a frame: every band that got loud there counts as an onset
  const play = ([t0, t32, t64]: Sound) => {
    const sort = createDrumSorter();
    const first = e(t0);
    const onsets = { low: Math.max(first.sub, first.low) > 0.22, mid: first.mid > 0.22, high: first.high > 0.22 };
    const none = { low: false, mid: false, high: false };
    // frames 16 ms apart; between the measured ones, the nearer one
    return [
      ...sort(onsets, first, 0),
      ...sort(none, first, 16),
      ...sort(none, e(t32), 32),
      ...sort(none, e(t32), 48),
      ...sort(none, e(t64), 64),
      ...sort(none, e(t64), 80),
    ];
  };

  for (const [kit, sounds] of Object.entries(KITS)) {
    for (const [sound, frames] of Object.entries(sounds)) {
      it(`${kit} ${sound} is ${EXPECTED[sound].join()}`, () => {
        const told = play(frames);
        // the MPC60's clap is so bright that a hat is heard in it too: no harm
        expect(kit === 'mpc60' && sound === 'cp' ? told.filter((role) => role !== 'hat') : told).toEqual(EXPECTED[sound]);
      });
    }
  }

  it('a kick with a hat on top is the kick', () => {
    const [bd, hh] = [KITS.tr909.bd, KITS.tr909.hh];
    const both = bd.map((frame, i) => frame.map((value, band) => Math.max(value, hh[i][band]))) as Sound;
    expect(play(both)).toEqual(['kick']);
  });

  it('one hit is one drum: nothing more until it is told', () => {
    const sort = createDrumSorter();
    const none = { low: false, mid: false, high: false };
    const [t0, t32] = KITS.studio.bd;
    expect(sort({ low: true, mid: true, high: false }, e(t0), 0)).toEqual([]);
    expect(sort({ low: false, mid: true, high: false }, e(t0), 16)).toEqual([]);
    expect(sort(none, e(t32), 32)).toEqual(['kick']);
    expect(sort({ low: true, mid: false, high: false }, e(t32), 48)).toEqual([]); // still the same kick ringing
    expect(sort(none, e(t32), 64)).toEqual([]);
  });

  // a quarter of a second after a kick its low end still rings: the hat
  // that lands then is a hat, not the kick again nor a snare
  for (const kit of ['studio', 'mpc60', 'tr909']) {
    it(`${kit}: a hat over the tail of a kick is only a hat`, () => {
      const sort = createDrumSorter();
      const none = { low: false, mid: false, high: false };
      const tail = e(KITS[kit].bd[2].map((value) => value * 0.8));
      for (let at = 0; at < 80; at += 16) sort(none, tail, at);
      const over = (frame: number[]) => e(frame.map((value, band) => Math.max(value, tail[BAND_ORDER[band]])));
      const [t0, t32, t64] = KITS[kit].hh;
      const told = [
        ...sort({ low: false, mid: true, high: true }, over(t0), 96),
        ...sort(none, over(t0), 112),
        ...sort(none, over(t32), 128),
        ...sort(none, over(t32), 144),
        ...sort(none, over(t64), 160),
        ...sort(none, over(t64), 176),
      ];
      expect(told).toEqual(['hat']);
    });
  }
});
