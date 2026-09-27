import { describe, expect, it } from 'vitest';
import { MIC_CONTROLS, MIC_NEUTRAL, MIC_PRESETS, crushCurve, driveCurve, echoTime, filterSettings, pitchSettings, softClipCurve } from './mic';

describe('mic effects', () => {
  it('leaves the signal alone with no distortion', () => {
    const curve = driveCurve(0, 5);
    expect([...curve]).toEqual([-1, -0.5, 0, 0.5, 1]);
  });
  it('bends the signal up with distortion, still between -1 and 1', () => {
    const curve = driveCurve(0.7, 5);
    expect(curve[3]).toBeGreaterThan(0.9);
    expect(Math.max(...curve)).toBeLessThanOrEqual(1);
  });
  it('narrows to a telephone band at the top of the filter', () => {
    expect(filterSettings(0)).toEqual({ lowCut: 60, highCut: 18000 });
    expect(filterSettings(1)).toEqual({ lowCut: 500, highCut: 3000 });
  });
});

describe('soft clip', () => {
  it('never passes 0.97 and leaves quiet signals nearly as they were', () => {
    const curve = softClipCurve(2049);
    expect(Math.max(...curve)).toBeLessThan(0.97);
    // input 0.1 → u = 0.05 at index 1024 + 0.05·1024
    expect(curve[1024 + 51]).toBeCloseTo(0.97 * Math.tanh(0.1), 2);
  });
});

describe('pitch', () => {
  it('shifts nothing in the middle and an octave at the ends', () => {
    expect(pitchSettings(0.5).semitones).toBe(0);
    expect(pitchSettings(0.51).semitones).toBe(0);
    expect(pitchSettings(1)).toMatchObject({ semitones: 12, ratio: 2, direction: -1 });
    expect(pitchSettings(0)).toMatchObject({ semitones: -12, ratio: 0.5, direction: 1 });
  });
  it('sweeps the delay window once per (ratio - 1) of it', () => {
    // an octave up through an 80 ms window: 80 ms of delay used up every 80 ms
    expect(pitchSettings(1, 0.08).rate).toBeCloseTo(12.5);
    expect(pitchSettings(0, 0.08).rate).toBeCloseTo(6.25);
  });
});

describe('lo-fi', () => {
  it('leaves the signal alone at 0 and steps it at the top', () => {
    const clean = crushCurve(0, 9);
    expect([...clean]).toEqual([-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1]);
    const crushed = crushCurve(1, 4096);
    expect(new Set(crushed).size).toBeLessThanOrEqual(9); // 3 bits
  });
});

describe('echo time', () => {
  it('lands on a dotted eighth of the tempo, or a slap when stopped', () => {
    expect(echoTime(0.5)).toBeCloseTo(0.375); // 120 BPM
    expect(echoTime(78 / 60 / 4)).toBeCloseTo(0.577, 3);
    expect(echoTime()).toBe(0.32);
    expect(echoTime(0.1)).toBe(0.95); // very slow: capped
  });
});

describe('presets', () => {
  it('set every control, between 0 and 1', () => {
    for (const preset of MIC_PRESETS) {
      expect(Object.keys(preset.settings).sort()).toEqual(MIC_CONTROLS.map((c) => c.id).sort());
      for (const value of Object.values(preset.settings)) expect(value).toBeGreaterThanOrEqual(0);
      for (const value of Object.values(preset.settings)) expect(value).toBeLessThanOrEqual(1);
    }
    expect(Object.keys(MIC_NEUTRAL).length).toBe(MIC_CONTROLS.length);
  });
});
