import { describe, expect, it } from 'vitest';
import { reaction, soundRole } from './clips-react';

describe('soundRole', () => {
  it('knows the drums by name, with or without a bank', () => {
    expect(soundRole({ s: 'bd' })).toBe('kick');
    expect(soundRole({ s: 'RolandTR909_bd' })).toBe('kick');
    expect(soundRole({ s: 'sd' })).toBe('snare');
    expect(soundRole({ s: 'cp' })).toBe('snare');
    expect(soundRole({ s: 'hh' })).toBe('hat');
    expect(soundRole({ s: 'oh' })).toBe('hat');
    expect(soundRole({ s: 'sawtooth' })).toBeUndefined();
    expect(soundRole({ note: 60 })).toBeUndefined();
    expect(soundRole(undefined)).toBeUndefined();
  });
});

describe('reaction', () => {
  it('does more the busier the mode', () => {
    expect(reaction('kick', 'off')).toBeUndefined();
    expect(reaction('kick', 'kick')).toBe('cut');
    expect(reaction('snare', 'kick')).toBeUndefined();
    expect(reaction('snare', 'drums')).toBe('stutter');
    expect(reaction('hat', 'drums')).toBeUndefined();
    expect(reaction('hat', 'all')).toBe('flash');
    expect(reaction(undefined, 'all')).toBeUndefined();
  });
});
