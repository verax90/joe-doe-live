import { describe, expect, it } from 'vitest';
import { keyToNote, keyToPad } from './typing';

describe('computer keyboard as an instrument', () => {
  it('plays a piano on the middle row and the one above', () => {
    expect(keyToNote('KeyA', 0)).toBe(60); // C4
    expect(keyToNote('KeyW', 0)).toBe(61); // C#4
    expect(keyToNote('KeyK', 0)).toBe(72); // C5
    expect(keyToNote('Semicolon', 0)).toBe(76); // Ñ on a Spanish keyboard: E5
    expect(keyToNote('KeyA', -2)).toBe(36);
    expect(keyToNote('KeyQ', 0)).toBeNull();
  });
  it('hits the pads with 1-8', () => {
    expect(keyToPad('Digit1')).toBe(0);
    expect(keyToPad('Digit8')).toBe(7);
    expect(keyToPad('Digit9')).toBeNull();
  });
});
