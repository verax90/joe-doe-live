import { describe, expect, it } from 'vitest';
import { FINISH_CONTROLS, finishCode, finishOn, liveQuality, quality } from './finish';

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
