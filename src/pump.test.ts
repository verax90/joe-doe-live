import { describe, expect, it } from 'vitest';
import { KICK_ORBIT, PUMP_DEFAULTS, pumpValue } from './pump';

const on = { ...PUMP_DEFAULTS, on: true, depth: 0.7, release: 0.5 };
const always = () => true;

describe('pump', () => {
  it('leaves everything alone when off', () => {
    const value = { s: 'bd' };
    expect(pumpValue(value, PUMP_DEFAULTS, 0.5, new Set([1]), always)).toBe(value);
  });

  it('moves a kick to its own orbit and ducks where the rest plays', () => {
    const seen = new Set<number>();
    expect(pumpValue({ s: 'hh' }, on, 0.5, seen, always)).toEqual({ s: 'hh' });
    pumpValue({ note: 'c3', s: 'sawtooth', orbit: 3 }, on, 0.5, seen, always);
    expect(seen).toEqual(new Set([1, 3]));
    // at 120 BPM (cps 0.5) a beat is 0.5 s: half a beat back is 0.25 s
    expect(pumpValue({ s: 'bd', bank: 'RolandTR909' }, on, 0.5, seen, always)).toEqual({
      s: 'bd',
      bank: 'RolandTR909',
      orbit: KICK_ORBIT,
      duckorbit: [1, 3],
      duckdepth: 0.7,
      duckonset: 0.004,
      duckattack: 0.25,
    });
  });

  it('keeps a kick with its own orbit there, and does not duck that orbit', () => {
    const seen = new Set([2, 5]);
    const out = pumpValue({ s: 'kick', orbit: 5 }, on, 0.5, seen, always) as Record<string, unknown>;
    expect(out.orbit).toBe(5);
    expect(out.duckorbit).toBe(2);
  });

  it('ducks only orbits that exist, and leaves ducking the code asked for', () => {
    expect(pumpValue({ s: 'bd' }, on, 0.5, new Set([1]), () => false)).toEqual({ s: 'bd', orbit: KICK_ORBIT });
    const own = { s: 'bd', duckorbit: 2 };
    expect(pumpValue(own, on, 0.5, new Set([1]), always)).toEqual(own); // not a kick for us: counts as the rest
    expect(pumpValue(1, on, 0.5, new Set(), always)).toBe(1);
  });
});
