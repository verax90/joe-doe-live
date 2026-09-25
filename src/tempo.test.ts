import { describe, expect, it } from 'vitest';
import { tapTempo, tempoInCode, withTempo } from './tempo';

describe('tempo line in the pattern', () => {
  it('rewrites an existing setcps line', () => {
    expect(withTempo('setcps(78 / 60 / 4)\ns("bd")', 90)).toBe('setcps(90 / 60 / 4)\ns("bd")');
    expect(withTempo('setcps(0.5)\ns("bd")', 120)).toBe('setcps(120 / 60 / 4)\ns("bd")');
  });

  it('adds one at the top when there is none', () => {
    expect(withTempo('s("bd sd")', 100)).toBe('setcps(100 / 60 / 4)\ns("bd sd")');
  });
});

describe('tap tempo', () => {
  it('needs two taps', () => {
    expect(tapTempo([0])).toBeNull();
  });

  it('averages the gaps between taps', () => {
    expect(tapTempo([0, 500, 1000, 1500])).toBe(120);
    expect(tapTempo([0, 600, 1180, 1790])).toBe(101);
  });
});

describe('tempo read from the code', () => {
  it('reads both ways of writing it', () => {
    expect(tempoInCode('setcps(78 / 60 / 4)\ns("bd")')).toBe(78);
    expect(tempoInCode('setcps(0.5)')).toBe(120);
  });

  it('is null without a setcps line', () => {
    expect(tempoInCode('s("bd sd")')).toBeNull();
  });
});
