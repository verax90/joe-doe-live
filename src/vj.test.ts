import { describe, expect, it } from 'vitest';
import { randomLook, recallLook, resetVj, savedLooks, saveLook, setVjControl, vj, VJ_CONTROLS, VJ_KNOBS, vjAngle, vjKnob, vjPositions, vjValues, withVj } from './vj';

const neutral = Object.fromEntries(VJ_CONTROLS.map((c) => [c.id, c.neutral])) as Parameters<typeof vjValues>[0];

describe('vjValues', () => {
  it('leaves the picture alone at the neutral positions', () => {
    expect(vjValues(neutral)).toEqual({
      zoom: 1, hue: 0, warp: 0, pixels: 4000, trails: 0, spin: 0,
      punch: 0, kaleid: 1, glitch: 0, split: 0, invert: 0, blocks: 0,
    });
  });
  it('goes both ways from the middle for zoom and spin', () => {
    const v = vjValues({ ...neutral, zoom: 1, spin: 0 });
    expect(v.zoom).toBeGreaterThan(2);
    expect(v.spin).toBeLessThan(0);
    expect(vjValues({ ...neutral, pixels: 1 }).pixels).toBe(12);
  });
  it('the kaleidoscope goes from two mirrors to twelve', () => {
    expect(vjValues({ ...neutral, kaleid: 0.05 }).kaleid).toBe(3);
    expect(vjValues({ ...neutral, kaleid: 1 }).kaleid).toBe(12);
  });
});

describe('the knobs of the MPK', () => {
  it('reach the first six effects only: 7 is the volume and 8 the ASCII filter', () => {
    expect(VJ_KNOBS).toBe(6);
    expect(VJ_CONTROLS.length).toBe(12);
    expect(vjKnob(7, 1)).toBe(false);
  });
});

describe('the spin', () => {
  it('adds up, so changing the speed does not make the picture jump', () => {
    const start = vjAngle(1000);
    vj.spin = 0.5;
    const later = vjAngle(1100);
    expect(later - start).toBeCloseTo(0.05);
    vj.spin = 0; // stopped: it stays where it was
    expect(vjAngle(1200)).toBeCloseTo(later);
    vj.spin = 0;
  });
});

describe('Surprise me', () => {
  it('moves two to four effects and keeps the rest neutral', () => {
    for (let seed = 0; seed < 20; seed++) {
      let n = seed * 0.137;
      const look = randomLook(() => (n = (n + 0.618) % 1));
      const moved = VJ_CONTROLS.filter((c) => look[c.id] !== c.neutral);
      expect(moved.length).toBeGreaterThanOrEqual(1);
      expect(moved.length).toBeLessThanOrEqual(4);
      expect(look.trails).toBeLessThanOrEqual(0.7);
    }
  });
});

describe('withVj', () => {
  it('does nothing while VJ is off', () => {
    expect(withVj('osc().out()')).toBe('osc().out()');
  });
});

describe('looks: four memories of the effects', () => {
  it('start empty, and an empty one changes nothing', () => {
    expect(savedLooks()).toEqual([false, false, false, false]);
    setVjControl('kaleid', 0.5);
    expect(recallLook(2)).toBe(false);
    expect(vjPositions().kaleid).toBe(0.5);
  });

  it('keep where everything is and bring it back', () => {
    setVjControl('kaleid', 0.5);
    setVjControl('invert', 1);
    saveLook(1);
    expect(savedLooks()).toEqual([false, true, false, false]);
    resetVj();
    expect(vjPositions().kaleid).toBe(0);
    expect(recallLook(1)).toBe(true);
    expect(vjPositions().kaleid).toBe(0.5);
    expect(vjPositions().invert).toBe(1);
    expect(vj.kaleid).toBe(7);
    resetVj();
  });
});
