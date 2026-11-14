import { describe, expect, it } from 'vitest';
import { FINISH_CONTROLS, PALETTES, gainOfLight, finishCode, finishOn, liveQuality, pal, quality, rgb, setPalette } from './finish';

describe('the finish over the picture', () => {
  const off = { glow: 0, grain: 0, vignette: 0 };

  it('comes on by default, mild', () => {
    for (const control of FINISH_CONTROLS) {
      expect(control.start).toBeGreaterThan(0);
      expect(control.start).toBeLessThanOrEqual(0.5);
    }
  });

  it('is skipped altogether with everything at zero', () => {
    expect(finishOn(off)).toBe(false);
    expect(finishCode(off)).toBeNull();
  });

  it('is one pass from o0 into o2, so the feedback effects never see the glow', () => {
    const code = finishCode({ ...off, grain: 0.2 })!;
    expect(code).toContain('finish(o0');
    expect(code).toContain('.out(o2)');
  });
});

describe('quality', () => {
  it('is light until asked, high while live, and back after', () => {
    expect(quality()).toBe('light');
    liveQuality(true);
    expect(quality()).toBe('high');
    liveQuality(false);
    expect(quality()).toBe('light');
  });
});

describe('palettes', () => {
  it('a colour in hex is three numbers from 0 to 1', () => {
    expect(rgb('#ff8000')).toEqual([1, 0.502, 0]);
    expect(rgb('#000000')).toEqual([0, 0, 0]);
  });

  it('every palette goes from dark to light in four colours', () => {
    const light = (hex: string) => rgb(hex).reduce((sum, part) => sum + part, 0);
    for (const palette of PALETTES) {
      expect(palette.stops).toHaveLength(4);
      expect(light(palette.stops[0])).toBeLessThan(light(palette.stops[3]));
    }
  });

  it('a palette is twelve numbers for Hydra and turns the pass on by itself', () => {
    setPalette('fire', 1);
    expect(pal.v).toHaveLength(12);
    expect(pal.amount).toBe(1);
    expect(finishOn({ glow: 0, grain: 0, vignette: 0 })).toBe(true);
    expect(finishCode({ glow: 0, grain: 0, vignette: 0 })).toContain('pal.v[11]');
  });

  it("the theme's colour is no palette at all", () => {
    setPalette('none', 1);
    expect(pal.amount).toBe(0);
    expect(finishOn({ glow: 0, grain: 0, vignette: 0 })).toBe(false);
  });

  it('Light goes from under the picture as it is to four times it', () => {
    expect(gainOfLight(0)).toBeCloseTo(0.6);
    expect(gainOfLight(1)).toBeCloseTo(4);
    expect(gainOfLight(0.5)).toBeGreaterThan(1.4);
    expect(gainOfLight(0.5)).toBeLessThan(1.7);
  });
});
