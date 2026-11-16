import { describe, expect, it } from 'vitest';
import { cardName, fold, pickAnother } from './gallery';

describe('the gallery', () => {
  it('searches without minding accents or case', () => {
    expect(fold('Cámara Térmica')).toBe('camara termica');
  });

  it('does not repeat the group on the card', () => {
    expect(cardName('Webcam (hexágonos)')).toBe('Hexágonos');
    expect(cardName('Radar')).toBe('Radar');
  });

  it('picks another one, never the one on', () => {
    expect(pickAnother(['a', 'b'], 'a', () => 0)).toBe('b');
    expect(pickAnother(['a'], 'a')).toBeUndefined();
  });
});
