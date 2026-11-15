import { describe, expect, it } from 'vitest';
import { heartbeatShape } from './visuals';

describe("the heart monitor's beat", () => {
  it('is flat before a touch and long after it', () => {
    expect(heartbeatShape(-10)).toBe(0);
    expect(heartbeatShape(1000)).toBe(0);
  });
  it('spikes up within a tenth of a second and dips below after', () => {
    const peak = Math.max(...Array.from({ length: 200 }, (_, ms) => heartbeatShape(ms)));
    const dip = Math.min(...Array.from({ length: 200 }, (_, ms) => heartbeatShape(ms)));
    expect(peak).toBeGreaterThan(0.4);
    expect(dip).toBeLessThan(-0.1);
    expect(heartbeatShape(115)).toBeCloseTo(0.42);
  });
});
