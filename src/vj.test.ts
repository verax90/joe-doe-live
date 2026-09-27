import { describe, expect, it } from 'vitest';
import { VJ_CONTROLS, vjValues, withVj } from './vj';

const neutral = Object.fromEntries(VJ_CONTROLS.map((c) => [c.id, c.neutral])) as Parameters<typeof vjValues>[0];

describe('vjValues', () => {
  it('leaves the picture alone at the neutral positions', () => {
    expect(vjValues(neutral)).toEqual({ zoom: 1, hue: 0, warp: 0, pixels: 4000, trails: 0, spin: 0 });
  });
  it('goes both ways from the middle for zoom and spin', () => {
    const v = vjValues({ ...neutral, zoom: 1, spin: 0 });
    expect(v.zoom).toBeGreaterThan(2);
    expect(v.spin).toBeLessThan(0);
    expect(vjValues({ ...neutral, pixels: 1 }).pixels).toBe(12);
  });
});

describe('withVj', () => {
  it('does nothing while VJ is off', () => {
    expect(withVj('osc().out()')).toBe('osc().out()');
  });
});
