import { describe, expect, it } from 'vitest';
import { driveCurve, filterSettings, softClipCurve } from './mic';

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
