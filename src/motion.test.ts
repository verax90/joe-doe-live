import { describe, expect, it } from 'vitest';
import { findMotion, fullAt, toGrey } from './motion';

const W = 16;
const H = 9;
const frame = (paint: (x: number, y: number) => number) => Uint8Array.from({ length: W * H }, (_, i) => paint(i % W, Math.floor(i / W)));

describe('movement between two frames of the webcam', () => {
  it('nothing moved: no point', () => {
    const still = frame(() => 80);
    expect(findMotion(still, still, W, H)).toBeNull();
  });

  it("the sensor's noise is not movement", () => {
    expect(findMotion(frame(() => 80), frame((x) => 80 + (x % 2 ? 6 : -6)), W, H)).toBeNull();
  });

  it('finds the middle of what changed', () => {
    const before = frame(() => 40);
    // a hand in the top right corner: columns 12-15, rows 0-2
    const now = frame((x, y) => (x >= 12 && y <= 2 ? 200 : 40));
    const found = findMotion(before, now, W, H)!;
    expect(found.x).toBeCloseTo(14 / W, 1);
    expect(found.y).toBeCloseTo(1.5 / H, 1);
    expect(found.amount).toBeCloseTo(12 / (W * H));
  });

  it('more of the picture moving is more motion', () => {
    const before = frame(() => 40);
    const little = findMotion(before, frame((x) => (x < 2 ? 200 : 40)), W, H)!;
    const lots = findMotion(before, frame((x) => (x < 10 ? 200 : 40)), W, H)!;
    expect(lots.amount).toBeGreaterThan(little.amount);
  });
});

describe('helpers', () => {
  it('grey from RGBA, green counting most', () => {
    const out = toGrey([255, 255, 255, 255, 0, 255, 0, 255, 0, 0, 0, 255], new Uint8Array(3));
    expect([...out]).toEqual([255, 153, 0]);
  });

  it('more sensitivity needs less of the picture to move', () => {
    expect(fullAt(1)).toBeLessThan(fullAt(0.5));
    expect(fullAt(0)).toBeCloseTo(0.3);
  });
});
