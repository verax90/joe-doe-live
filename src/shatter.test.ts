import { describe, expect, it } from 'vitest';
import { FALL, makeShards, shardOffset } from './shatter';

const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const area = (points: [number, number][]) =>
  Math.abs(points.reduce((sum, [x, y], i) => {
    const [nx, ny] = points[(i + 1) % points.length];
    return sum + x * ny - nx * y;
  }, 0)) / 2;

// inside a convex-ish polygon by ray casting
function inside([x, y]: [number, number], points: [number, number][]) {
  let hit = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

describe('makeShards', () => {
  const shards = makeShards(640, 360, 300, 200, seeded(7));

  it('breaks the pane into rays times four rings', () => {
    expect(shards.length % 4).toBe(0);
    expect(shards.length).toBeGreaterThanOrEqual(44);
    expect(shards.every((s) => area(s.points) > 0)).toBe(true);
  });

  it('leaves no hole: every spot of the picture is in some shard', () => {
    for (let x = 5; x < 640; x += 37) {
      for (let y = 5; y < 360; y += 29) {
        expect(shards.some((s) => inside([x, y], s.points))).toBe(true);
      }
    }
  });
});

describe('shardOffset', () => {
  const [shard] = makeShards(640, 360, 320, 180, seeded(3));

  it('starts and ends in place, and is away in between', () => {
    expect(shardOffset(shard, 0, 2, 1000)).toEqual({ x: 0, y: 0, angle: 0 });
    const away = shardOffset(shard, FALL, 2, 1000);
    expect(Math.hypot(away.x, away.y)).toBeGreaterThan(10);
    const back = shardOffset(shard, 1, 2, 1000);
    expect(Math.abs(back.x) + Math.abs(back.y) + Math.abs(back.angle)).toBeLessThan(1e-9);
  });
});
