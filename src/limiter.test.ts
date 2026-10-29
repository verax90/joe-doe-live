import { describe, expect, it } from 'vitest';
import { djFilterSetting } from './limiter';

describe('DJ filter (the phone XY)', () => {
  it('lets everything through in the middle', () => {
    expect(djFilterSetting(0.5, 0.9)).toEqual({ type: 'lowpass', frequency: 22000, q: 0.7 });
  });
  it('closes a low-pass to the left and a high-pass to the right', () => {
    expect(djFilterSetting(0, 0)).toMatchObject({ type: 'lowpass', frequency: 80 });
    expect(djFilterSetting(1, 1)).toMatchObject({ type: 'highpass', frequency: 8000, q: 14.7 });
    expect(djFilterSetting(0.25, 0).frequency).toBeCloseTo(80 * Math.sqrt(250));
  });
});
