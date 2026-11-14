import { describe, expect, it } from 'vitest';
import { modSource, moved, movedValues, nextLook, setVjMod, vjMods, randomLook, recallLook, resetVj, savedLooks, saveLook, setVjControl, vj, VJ_CONTROLS, VJ_KNOBS, vjAngle, vjKnob, vjPositions, vjValues, withVj } from './vj';

const neutral = Object.fromEntries(VJ_CONTROLS.map((c) => [c.id, c.neutral])) as Parameters<typeof vjValues>[0];

describe('vjValues', () => {
  it('leaves the picture alone at the neutral positions', () => {
    expect(vjValues(neutral)).toEqual({
      zoom: 1, hue: 0, warp: 0, pixels: 4000, trails: 0, spin: 0,
      punch: 0, kaleid: 1, glitch: 0, split: 0, invert: 0, blocks: 0,
      tunnel: 0, fluid: 0, dots: 0, dotCells: 96, feedback: 0,
    });
  });
  it('the dots bring their own cells, and the feedback is the most any effect asks for', () => {
    expect(vjValues({ ...neutral, dots: 1 }).pixels).toBe(24);
    expect(vjValues({ ...neutral, dots: 0.5, pixels: 1 }).pixels).toBe(12);
    expect(vjValues({ ...neutral, trails: 0.2, tunnel: 1 }).feedback).toBeCloseTo(0.85);
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
    expect(VJ_CONTROLS.length).toBe(15);
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

describe('effects that move by themselves', () => {
  it('from the middle a swing goes both ways; from an end, towards the other', () => {
    expect(moved(0.5, 0, true)).toBeCloseTo(0.2);
    expect(moved(0.5, 1, true)).toBeCloseTo(0.8);
    expect(moved(0, 0, true)).toBe(0);
    expect(moved(0, 1, true)).toBeCloseTo(0.6);
    expect(moved(1, 1, true)).toBeCloseTo(0.4);
  });

  it('following the music pushes away from where the slider rests', () => {
    expect(moved(0.5, 1, false)).toBeCloseTo(1); // never past the end
    expect(moved(0.2, 0.5, false)).toBeCloseTo(0.5);
    expect(moved(0.2, 0, false)).toBeCloseTo(0.2); // silence: where you left it
  });

  it('the slow swing takes four bars, the fast one a beat, while the studio plays', () => {
    expect(modSource('slow', 0, 0)).toBeCloseTo(0);
    expect(modSource('slow', 0, 2)).toBeCloseTo(1); // half way: the far end
    expect(modSource('slow', 0, 4)).toBeCloseTo(0);
    expect(modSource('fast', 0, 0.125)).toBeCloseTo(1); // half a beat
    expect(modSource('fast', 0, 0.25)).toBeCloseTo(0);
  });

  it('and eight seconds and half a second while it does not', () => {
    expect(modSource('slow', 4, null)).toBeCloseTo(1);
    expect(modSource('fast', 0.25, null)).toBeCloseTo(1);
  });

  it('a jump holds for the whole beat and lands somewhere else on the next', () => {
    const first = modSource('jump', 0, 0.01);
    expect(modSource('jump', 0, 0.24)).toBe(first);
    expect(modSource('jump', 0, 0.26)).not.toBe(first);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(1);
  });

  it('the webcam is a source too', () => {
    expect(modSource('move', 0, null, { bass: 0, kick: 0, high: 0, move: 0.7 })).toBe(0.7);
  });

  it('the music sources are what is heard', () => {
    expect(modSource('kick', 0, null, { bass: 0.2, kick: 0.9, high: 0.1, move: 0 })).toBe(0.9);
    expect(modSource('none', 3, 1, { bass: 1, kick: 1, high: 1, move: 1 })).toBe(0);
  });

  it('only what has a movement moves; the sliders stay put', () => {
    resetVj();
    setVjMod('kaleid', 'kick');
    const values = movedValues(0, null, { bass: 0, kick: 1, high: 0, move: 0 });
    expect(values.kaleid).toBeGreaterThan(2);
    expect(values.zoom).toBe(1);
    expect(vjPositions().kaleid).toBe(0);
    setVjMod('kaleid', 'none');
    expect(vj.kaleid).toBe(1);
  });

  it('a look keeps the movements too, and All neutral stops them', () => {
    resetVj();
    setVjControl('warp', 0.3);
    setVjMod('warp', 'slow');
    saveLook(0);
    resetVj();
    expect(vjMods().warp).toBe('none');
    expect(recallLook(0)).toBe(true);
    expect(vjMods().warp).toBe('slow');
    expect(vjPositions().warp).toBe(0.3);
    resetVj();
  });
});

describe('looks taking turns', () => {
  it('go round the memories that hold something', () => {
    const filled = [true, false, true, true];
    expect(nextLook(filled, undefined)).toBe(0);
    expect(nextLook(filled, 0)).toBe(2);
    expect(nextLook(filled, 3)).toBe(0);
  });
  it('need at least two', () => {
    expect(nextLook([false, true, false, false], undefined)).toBeUndefined();
  });
});
