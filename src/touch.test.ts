import { describe, expect, it } from 'vitest';
import { easeTowards } from './midi';

describe('TouchMe touch()', () => {
  it('glides towards the new strength instead of jumping', () => {
    expect(easeTowards(0, 1, 0)).toBe(0);
    expect(easeTowards(0, 1, 60)).toBeCloseTo(1 - Math.exp(-1));
    expect(easeTowards(0, 1, 600)).toBeCloseTo(1, 3);
    expect(easeTowards(1, 0, 60)).toBeCloseTo(Math.exp(-1));
  });
  it('never goes backwards in time', () => {
    expect(easeTowards(0.5, 1, -100)).toBe(0.5);
  });
});
