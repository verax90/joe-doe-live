import { describe, expect, it } from 'vitest';
import { chopAt, chops, chopsCode, equalCuts, hitCuts, loopCode, nextName, normalize, takeWindow, type Stereo } from './sampler';

const block = (time: number, values: number[]) => ({ time, channels: [Float32Array.from(values), Float32Array.from(values.map((v) => -v))] });

describe('sampler', () => {
  it('takes exactly the samples between two clock times', () => {
    // sample rate 4: a block of 4 samples per second of clock
    const blocks = [block(0, [1, 2, 3, 4]), block(1, [5, 6, 7, 8]), block(2, [9, 10, 11, 12])];
    const [left, right] = takeWindow(blocks, 0.5, 2.25, 4);
    expect([...left]).toEqual([3, 4, 5, 6, 7, 8, 9]);
    expect([...right]).toEqual([-3, -4, -5, -6, -7, -8, -9]);
  });
  it('leaves silence where no block came', () => {
    const [left] = takeWindow([block(1, [1, 1])], 0, 1.5, 4);
    expect([...left]).toEqual([0, 0, 0, 0, 1, 1]);
  });
  it('brings the loudest point to 0.9 and leaves silence alone', () => {
    const loud = normalize([Float32Array.from([0.1, -0.3]), Float32Array.from([0.2, 0])]);
    expect(loud[0][1]).toBeCloseTo(-0.9);
    expect(loud[1][0]).toBeCloseTo(0.6);
    const quiet: Stereo = [new Float32Array(3), new Float32Array(3)];
    expect(normalize(quiet)[0]).toBe(quiet[0]);
  });
  it('cuts equal chops, spreading any leftover samples', () => {
    const audio: Stereo = [Float32Array.from({ length: 10 }, (_, i) => i), new Float32Array(10)];
    const parts = chops(audio, 4);
    expect(parts.map(([l]) => l.length)).toEqual([2, 3, 2, 3]);
    expect([...parts[1][0]]).toEqual([2, 3, 4]);
  });
  it('names takes muestra1, muestra2… and writes code that stays in time', () => {
    expect(nextName([])).toBe('muestra1');
    expect(nextName(['muestra1', 'muestra1_trozos', 'kicks'])).toBe('muestra2');
    expect(loopCode('muestra1', 2)).toBe('s("muestra1").loopAt(2)');
    expect(chopsCode('muestra1', 1)).toBe('s("muestra1_trozos").n("0 1 2 3 4 5 6 7")');
    expect(chopsCode('muestra1', 4)).toBe('s("muestra1_trozos").n("0 1 2 3 4 5 6 7").slow(4)');
  });
});

describe('chopping by hits', () => {
  // three short bursts at known places in 1 s of near silence
  const take = (): Stereo => {
    const sr = 8000;
    const left = new Float32Array(sr);
    for (const at of [0.0, 0.31, 0.62]) for (let i = 0; i < 400; i++) left[Math.round(at * sr) + i] = Math.sin(i * 0.3) * Math.exp(-i / 120);
    return [left, left.slice()];
  };
  it('cuts where each hit starts, just before its attack', () => {
    const cuts = hitCuts(take(), 8000, 8);
    expect(cuts[0]).toBe(0);
    // the other two hits, 2 to 4 ms before them
    const hits = cuts.slice(1).map((c) => c / 8000);
    expect(hits.length).toBe(2);
    expect(0.31 - hits[0]).toBeGreaterThanOrEqual(0.001);
    expect(0.31 - hits[0]).toBeLessThanOrEqual(0.004);
    expect(0.62 - hits[1]).toBeGreaterThanOrEqual(0.001);
    expect(0.62 - hits[1]).toBeLessThanOrEqual(0.004);
  });
  it('cuts the take into chops that add up to it', () => {
    const audio = take();
    const parts = chopAt(audio, [0, 2000, 5000]);
    expect(parts.map(([l]) => l.length)).toEqual([2000, 3000, 3000]);
    expect(equalCuts(10, 4)).toEqual([0, 2, 5, 7]);
  });
  it('writes the chop pattern for any number of chops', () => {
    expect(chopsCode('m', 2, 4)).toBe('s("m_trozos").n("0 1 2 3").slow(2)');
  });
});
