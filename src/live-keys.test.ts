import { describe, expect, it } from 'vitest';
import { liveKey, nextPalette } from './live-keys';
import { PALETTES } from './finish';

describe('the VJ from the keyboard', () => {
  it('1 to 4 are the looks', () => {
    expect(liveKey('1')).toEqual({ look: 0 });
    expect(liveKey('4')).toEqual({ look: 3 });
    expect(liveKey('5')).toBeUndefined();
  });
  it('0 is all neutral, D the dice, V another visual, P the next palette, space a kick', () => {
    expect(liveKey('0')).toBe('neutral');
    expect(liveKey('d')).toBe('dice');
    expect(liveKey('D')).toBe('dice');
    expect(liveKey('v')).toBe('visual');
    expect(liveKey('p')).toBe('palette');
    expect(liveKey(' ')).toBe('kick');
  });
  it('any other key is left alone', () => {
    expect(liveKey('a')).toBeUndefined();
    expect(liveKey('Enter')).toBeUndefined();
  });
  it('the palettes go round', () => {
    expect(nextPalette('none')).toBe(PALETTES[1].id);
    expect(nextPalette(PALETTES[PALETTES.length - 1].id)).toBe('none');
  });
});
