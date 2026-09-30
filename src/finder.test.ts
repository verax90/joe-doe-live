import { describe, expect, it } from 'vitest';
import { plain, rank, type Entry } from './finder';

const entry = (label: string, kind = '') => ({ label, kind, run: () => undefined }) as Entry;

describe('finder', () => {
  it('ignores accents and case', () => {
    expect(plain(' Micrófono ')).toBe('microfono');
  });

  it('puts what starts with the letters first, then a word, then anywhere', () => {
    const entries = [entry('Pista de fondo'), entry('Bombeo'), entry('Sesión de bombo', 'Patrón'), entry('Vídeo'), entry('Pistas combo')];
    expect(rank(entries, 'bomb').map((e) => e.label)).toEqual(['Bombeo', 'Sesión de bombo']);
    expect(rank(entries, 'omb').map((e) => e.label)).toEqual(['Bombeo', 'Sesión de bombo', 'Pistas combo']);
    expect(rank(entries, 'video').map((e) => e.label)).toEqual(['Vídeo']);
    expect(rank(entries, 'patron').map((e) => e.label)).toEqual(['Sesión de bombo']);
  });

  it('shows the first few when empty, and at most the limit', () => {
    const many = Array.from({ length: 20 }, (_, i) => entry(`item ${i}`));
    expect(rank(many, '')).toHaveLength(8);
    expect(rank(many, 'item', 3)).toHaveLength(3);
  });
});
