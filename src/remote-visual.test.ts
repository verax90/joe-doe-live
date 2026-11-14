import { describe, expect, it } from 'vitest';
import { nextVisual } from './remote-visual';

describe("the phone's «Another» button", () => {
  const items = ['auto', 'lima', 'maq-mosh', 'ninguno'].map((id) => ({ id, name: id, group: '' }));

  it('picks another visual, never the one showing, Auto or none', () => {
    expect(nextVisual(items, 'lima', () => 0)).toBe('maq-mosh');
    expect(nextVisual(items, 'maq-mosh', () => 0.99)).toBe('lima');
    expect(nextVisual(items, 'auto', () => 0)).toBe('lima');
  });

  it('has nothing to offer with a single visual', () => {
    expect(nextVisual(items.slice(1, 2), 'lima')).toBeUndefined();
  });
});
