import { describe, expect, it } from 'vitest';
import { cardName, dropPick, fold, pickAnother } from './gallery';
import { visuals } from './visuals';

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

  it('on the drop: a favourite, else one of the same group, no webcam by surprise', () => {
    const radar = visuals.find((v) => v.id === 'radar');
    expect(dropPick(radar, new Set(['vinilo', 'radar']))).toBe('vinilo');
    for (let i = 0; i < 20; i++) {
      const id = dropPick(radar, new Set());
      const next = visuals.find((v) => v.id === id)!;
      expect(next.camera).toBeFalsy();
      expect(['vaporwave', 'net-art', 'hifi', 'escritorio', 'cobre', 'hipercubo', 'vida', 'truchet', 'tormenta', 'mandelbrot', 'vinilo', 'vhs', 'matrix']).toContain(next.id);
    }
    expect(dropPick(radar, new Set(['cam-cga', 'vinilo']))).toBe('vinilo');
  });
});
